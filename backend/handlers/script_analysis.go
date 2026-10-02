package handlers

import (
	"film-production-erp/models"
	"film-production-erp/services"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AIAnalysisResult struct {
	Elements []models.ProductionElement `json:"elements"`
}

func UploadScript(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodIDStr := c.Param("productionId")
		prodID, err := strconv.ParseUint(prodIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid production ID"})
			return
		}

		var scriptText string

		// 1. Check if file was uploaded via FormFile
		file, err := c.FormFile("script")
		if err == nil {
			f, err := file.Open()
			if err == nil {
				defer f.Close()
				content, err := io.ReadAll(f)
				if err == nil {
					scriptText = string(content)
				}
			}
		}

		// 2. If no file, check JSON body payload (for live editing re-analysis)
		if scriptText == "" {
			var body struct {
				ScriptText string `json:"scriptText"`
				Text       string `json:"text"`
			}
			if err := c.ShouldBindJSON(&body); err == nil {
				if body.ScriptText != "" {
					scriptText = body.ScriptText
				} else {
					scriptText = body.Text
				}
			}
		}

		if scriptText == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Script content (file or text) is required"})
			return
		}

		// 3. Auto-sync with Writer's Room AI (StoryDocument)
		var storyDoc models.StoryDocument
		if err := db.Where("production_id = ?", prodID).First(&storyDoc).Error; err != nil {
			storyDoc = models.StoryDocument{
				ProductionID: uint(prodID),
				Title:        "Master Screenplay",
				ContentJSON:  scriptText,
				Status:       "Committed",
			}
			db.Create(&storyDoc)
		} else {
			db.Model(&storyDoc).Updates(map[string]interface{}{
				"content_json": scriptText,
				"status":       "Committed",
				"updated_at":   time.Now(),
			})
		}

		// 4. Create new ScriptVersion
		var lastVersion models.ScriptVersion
		db.Where("production_id = ?", prodID).Order("version desc").First(&lastVersion)

		newVersionNum := 1
		if lastVersion.ID != 0 {
			newVersionNum = lastVersion.Version + 1
		}

		newVersion := models.ScriptVersion{
			ProductionID: uint(prodID),
			Version:      newVersionNum,
			Label:        "Draft " + strconv.Itoa(newVersionNum),
		}
		db.Create(&newVersion)

		// 5. Delete previous elements/scenes for clean re-analysis
		db.Where("production_id = ?", prodID).Delete(&models.ProductionElement{})
		db.Where("production_id = ?", prodID).Delete(&models.Scene{})

		// 6. Parse script into scenes
		scenes := services.ParseScript(uint(prodID), scriptText)

		// Save scenes
		for i := range scenes {
			scenes[i].ScriptVersionID = newVersion.ID
			db.Create(&scenes[i])
		}

		// 7. Run entity extraction (AI Orchestrator / regex fallback)
		elements := services.ExtractEntities(uint(prodID), scenes)

		// Save elements
		for i := range elements {
			elements[i].ProductionID = uint(prodID)
			elements[i].ScriptVersionID = newVersion.ID
			db.Create(&elements[i])
		}

		// 8. Predict total shoot days from extracted entity counts
		numChars, numLocs, numProps, numCostumes, numEquip := services.CountElementsByType(elements)
		predictedDays := services.PredictShootDays(numChars, numLocs, numProps, numCostumes, numEquip)
		db.Model(&models.Production{}).Where("id = ?", prodID).Update("predicted_shoot_days", predictedDays)

		var diff *models.ScriptDiff
		if lastVersion.ID != 0 {
			diff = services.CompareScriptVersions(db, uint(prodID), lastVersion.ID, newVersion.ID)
		}

		c.JSON(http.StatusOK, gin.H{
			"message":            "Script processed successfully",
			"version":            newVersion,
			"scenes":             len(scenes),
			"elements":           len(elements),
			"predictedShootDays": predictedDays,
			"diff":               diff,
			"storyDocumentId":    storyDoc.ID,
		})
	}
}

func GetExtractedElements(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		var elements []models.ProductionElement
		db.Where("production_id = ?", prodID).Find(&elements)
		c.JSON(http.StatusOK, elements)
	}
}

// RecalculatePrediction re-runs the shoot-day prediction and budget
// generation from whatever entities currently exist for a production —
// without requiring a fresh script upload. This is the missing half of the
// human-in-the-loop loop: a producer can add/remove/correct entities (via
// UpdateEntity / verification actions) after the initial extraction, then
// call this to get an updated day and cost estimate reflecting those edits,
// rather than being stuck with the numbers computed at upload time.
func RecalculatePrediction(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodIDStr := c.Param("productionId")
		prodID, err := strconv.ParseUint(prodIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid production ID"})
			return
		}

		var prod models.Production
		if err := db.First(&prod, prodID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Production not found"})
			return
		}

		var elements []models.ProductionElement
		db.Where("production_id = ?", prodID).Find(&elements)
		if len(elements) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No entities found for this production — analyse a script first"})
			return
		}

		// Re-predict shoot days from the current (possibly edited) entity set
		numChars, numLocs, numProps, numCostumes, numEquip := services.CountElementsByType(elements)
		predictedDays := services.PredictShootDays(numChars, numLocs, numProps, numCostumes, numEquip)
		db.Model(&prod).Update("predicted_shoot_days", predictedDays)
		prod.PredictedShootDays = predictedDays

		// Regenerate the budget using the updated prediction (scale is
		// derived from PredictedShootDays, so this must run after the update above)
		db.Where("production_id = ? AND is_manually_set = ?", prodID, false).Delete(&models.BudgetItem{})
		var activeRateCard models.RateCard
		db.Where("is_active = ?", true).First(&activeRateCard)
		budgetItems := services.GenerateQuote(db, &prod, elements, &activeRateCard)
		for i := range budgetItems {
			db.Create(&budgetItems[i])
		}

		c.JSON(http.StatusOK, gin.H{
			"message":            "Recalculated from current entities",
			"elements":           len(elements),
			"predictedShootDays": predictedDays,
			"budgetItems":        len(budgetItems),
		})
	}
}
