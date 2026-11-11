package handlers

import (
	"net/http"

	"film-production-erp/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetFXRates returns all exchange rates
func GetFXRates(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		var rates []models.FXRate
		if err := db.Where("organization_id = ?", uint(orgID.(float64))).Order("effective_date desc").Find(&rates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, rates)
	}
}

// AddFXRate adds a new manual exchange rate
func AddFXRate(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.FXRate
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		orgID, _ := c.Get("orgID")
		input.OrganizationID = uint(orgID.(float64))
		input.Source = "manual"

		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, input)
	}
}
