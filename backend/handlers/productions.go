package handlers

import (
	"film-production-erp/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateProduction(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var p models.Production
		if err := c.ShouldBindJSON(&p); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		p.Status = "Planning"
		if err := db.Create(&p).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create production"})
			return
		}

		c.JSON(http.StatusCreated, p)
	}
}

func GetProductions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var productions []models.Production
		db.Find(&productions)
		c.JSON(http.StatusOK, productions)
	}
}

func GetProduction(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("productionId")
		var p models.Production
		if err := db.First(&p, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Production not found"})
			return
		}
		c.JSON(http.StatusOK, p)
	}
}
