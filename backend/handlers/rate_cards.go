package handlers

import (
	"film-production-erp/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetRateCards(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		var cards []models.RateCard
		db.Where("organization_id = ?", uint(orgID.(float64))).Find(&cards)
		c.JSON(http.StatusOK, cards)
	}
}

func CreateRateCard(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var card models.RateCard
		if err := c.ShouldBindJSON(&card); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		orgID, _ := c.Get("orgID")
		card.OrganizationID = uint(orgID.(float64))

		db.Create(&card)
		c.JSON(http.StatusCreated, card)
	}
}

func UpdateRateCard(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		id := c.Param("id")

		var card models.RateCard
		if err := db.Where("organization_id = ?", uint(orgID.(float64))).First(&card, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Rate card not found"})
			return
		}

		var updateData map[string]interface{}
		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		db.Model(&card).Updates(updateData)
		c.JSON(http.StatusOK, card)
	}
}

func ActivateRateCard(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		id := c.Param("id")

		// Deactivate all others for this org
		db.Model(&models.RateCard{}).Where("organization_id = ?", uint(orgID.(float64))).Update("is_active", false)

		var card models.RateCard
		if err := db.Where("organization_id = ?", uint(orgID.(float64))).First(&card, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Rate card not found"})
			return
		}

		db.Model(&card).Update("is_active", true)
		c.JSON(http.StatusOK, gin.H{"message": "Rate card activated"})
	}
}
