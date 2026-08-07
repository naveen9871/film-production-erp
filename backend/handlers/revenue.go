package handlers

import (
	"film-production-erp/models"
	"film-production-erp/services"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AddRightsRecord(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var record models.RightsRecord
		if err := c.ShouldBindJSON(&record); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := db.Create(&record).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add rights record"})
			return
		}

		c.JSON(http.StatusCreated, record)
	}
}

func GetRightsRecords(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		var records []models.RightsRecord
		db.Where("production_id = ?", prodID).Find(&records)
		c.JSON(http.StatusOK, records)
	}
}

func GetProfitabilityReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		
		var budgetItems []models.BudgetItem
		db.Where("production_id = ?", prodID).Find(&budgetItems)

		var rightsRecords []models.RightsRecord
		db.Where("production_id = ?", prodID).Find(&rightsRecords)

		report := services.ComputeProfitability(budgetItems, rightsRecords)
		c.JSON(http.StatusOK, report)
	}
}
