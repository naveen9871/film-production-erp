package handlers

import (
	"film-production-erp/models"
	"film-production-erp/services"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateStoryDocument(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.StoryDocument
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		orgID, _ := c.Get("orgID")
		input.OrganizationID = uint(orgID.(float64))
		input.Status = "Draft"

		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, input)
	}
}

func GetStoryDocuments(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		var docs []models.StoryDocument
		db.Where("organization_id = ?", uint(orgID.(float64))).Find(&docs)
		c.JSON(http.StatusOK, docs)
	}
}

func GetStoryDocument(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var doc models.StoryDocument
		if err := db.First(&doc, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}
		c.JSON(http.StatusOK, doc)
	}
}

func SaveStoryDocument(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input models.StoryDocument
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := db.Model(&models.StoryDocument{}).Where("id = ?", id).Updates(models.StoryDocument{
			ContentJSON: input.ContentJSON,
			Title:       input.Title,
			Genre:       input.Genre,
			Tone:        input.Tone,
			UpdatedAt:   time.Now(),
		}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Saved successfully"})
	}
}

func AddDocumentComment(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		docID, _ := strconv.ParseUint(c.Param("id"), 10, 32)
		var input models.DocumentComment
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID, _ := c.Get("userID")
		input.AuthorID = uint(userID.(float64))
		
		// Fetch author name
		var user models.User
		db.First(&user, input.AuthorID)
		input.AuthorName = user.Name
		if input.AuthorName == "" {
			input.AuthorName = user.Username
		}

		input.StoryDocumentID = uint(docID)

		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, input)
	}
}

func GetDocumentComments(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		docID := c.Param("id")
		var comments []models.DocumentComment
		db.Where("story_document_id = ?", docID).Find(&comments)
		c.JSON(http.StatusOK, comments)
	}
}

// CommitToProduction converts the rich text into a ScriptVersion
func CommitToProduction(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var doc models.StoryDocument
		if err := db.First(&doc, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}

		// Update doc status
		db.Model(&doc).Update("status", "Committed")

		// In a real implementation, we would extract the raw text from TipTap ContentJSON here.
		// For MVP, we will assume ContentJSON holds raw plain text if we want, but let's mock it
		rawText := "EXT. CITY - DAY\n\nAI generated script extracted from Studio." // Placeholder
		
		// Create new ScriptVersion
		var lastVersion models.ScriptVersion
		db.Where("production_id = ?", doc.ProductionID).Order("version desc").First(&lastVersion)
		
		newVersionNum := 1
		if lastVersion.ID != 0 {
			newVersionNum = lastVersion.Version + 1
		}
		
		newVersion := models.ScriptVersion{
			ProductionID: doc.ProductionID,
			Version:      newVersionNum,
			Label:        "Studio Export: " + doc.Title,
		}
		db.Create(&newVersion)

		scenes := services.ParseScript(doc.ProductionID, rawText)
		for i := range scenes {
			scenes[i].ScriptVersionID = newVersion.ID
			db.Create(&scenes[i])
		}

		elements := services.ExtractEntities(doc.ProductionID, scenes)
		for i := range elements {
			elements[i].ProductionID = doc.ProductionID
			elements[i].ScriptVersionID = newVersion.ID
			db.Create(&elements[i])
		}

		var diff *models.ScriptDiff
		if lastVersion.ID != 0 {
			diff = services.CompareScriptVersions(db, doc.ProductionID, lastVersion.ID, newVersion.ID)
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Document committed to production",
			"version":  newVersion,
			"scenes":   len(scenes),
			"elements": len(elements),
			"diff":     diff,
		})
	}
}

// AISuggest handles AI co-pilot requests
func AISuggest(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Action  string `json:"action"` // suggest_dialogue, analyze_genre, expand_scene, format_screenplay
			Context string `json:"context"` // The text to analyze
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var suggestion string
		switch req.Action {
		case "analyze_genre":
			suggestion = "Thriller / Drama"
		case "suggest_dialogue":
			suggestion = "- 'I told you not to come here!'\n- 'This is my city now.'\n- 'Get out before I call the cops.'"
		case "expand_scene":
			suggestion = "The rain pours heavily as John steps out of the car. He looks around nervously. The street is completely empty."
		default:
			suggestion = "AI suggestion unavailable."
		}

		c.JSON(http.StatusOK, gin.H{"suggestion": suggestion})
	}
}
