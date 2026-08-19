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

		orgID, _ := c.Get("orgID")
		p.OrganizationID = uint(orgID.(float64)) // JWT numbers parse as float64
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
		orgID, _ := c.Get("orgID")
		var productions []models.Production
		db.Where("organization_id = ?", uint(orgID.(float64))).Find(&productions)
		c.JSON(http.StatusOK, productions)
	}
}

func GetProduction(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		id := c.Param("productionId")
		var p models.Production
		if err := db.Where("organization_id = ?", uint(orgID.(float64))).First(&p, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Production not found"})
			return
		}
		c.JSON(http.StatusOK, p)
	}
}
