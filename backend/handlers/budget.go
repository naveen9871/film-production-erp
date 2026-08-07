package handlers

import (
	"film-production-erp/models"
	"film-production-erp/services"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GenerateBudgetQuote(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")

		var prod models.Production
		if err := db.First(&prod, prodID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Production not found"})
			return
		}

		var elements []models.ProductionElement
		db.Where("production_id = ?", prodID).Find(&elements)

		// Delete existing AI generated budget items for safety
		db.Where("production_id = ? AND is_manually_set = ?", prodID, false).Delete(&models.BudgetItem{})

		budgetItems := services.GenerateQuote(&prod, elements)
		for i := range budgetItems {
			db.Create(&budgetItems[i])
		}

		c.JSON(http.StatusOK, gin.H{"message": "Budget quote generated", "items": budgetItems})
	}
}

func AllocateBudget(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")

		var prod models.Production
		if err := db.First(&prod, prodID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Production not found"})
			return
		}

		// Delete existing allocations
		db.Where("production_id = ? AND category = ?", prodID, "Allocation").Delete(&models.BudgetItem{})

		budgetItems := services.AllocateBudget(&prod)
		for i := range budgetItems {
			db.Create(&budgetItems[i])
		}

		c.JSON(http.StatusOK, gin.H{"message": "Budget allocated", "items": budgetItems})
	}
}

func GetBudget(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		var items []models.BudgetItem
		db.Where("production_id = ?", prodID).Find(&items)
		c.JSON(http.StatusOK, items)
	}
}
