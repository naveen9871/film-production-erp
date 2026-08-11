package handlers

import (
	"film-production-erp/models"
	"film-production-erp/services"
	"io"
	"net/http"
	"strconv"

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

		file, err := c.FormFile("script")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Script file is required"})
			return
		}

		f, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
			return
		}
		defer f.Close()

		content, err := io.ReadAll(f)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
			return
		}

		// Parse script
		scenes := services.ParseScript(uint(prodID), string(content))
		
		// Save scenes
		for i := range scenes {
			db.Create(&scenes[i])
		}

		// Run entity extraction (uses AI Orchestrator if GEMINI_API_KEY is set, else regex fallback)
		elements := services.ExtractEntities(uint(prodID), scenes)

		// Save elements
		for i := range elements {
			elements[i].ProductionID = uint(prodID)
			db.Create(&elements[i])
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Script processed successfully",
			"scenes":   len(scenes),
			"elements": len(elements),
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
