package handlers

import (
	"film-production-erp/models"
	"film-production-erp/services"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AddExpense(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var expense models.Expense
		if err := c.ShouldBindJSON(&expense); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := db.Create(&expense).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add expense"})
			return
		}

		// Update actual cost on budget item
		var budgetItem models.BudgetItem
		if err := db.First(&budgetItem, expense.BudgetItemID).Error; err == nil {
			budgetItem.ActualCost += expense.Amount
			db.Save(&budgetItem)
		}

		c.JSON(http.StatusCreated, expense)
	}
}

func GetExpenses(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		var expenses []models.Expense
		db.Where("production_id = ?", prodID).Find(&expenses)
		c.JSON(http.StatusOK, expenses)
	}
}

func GetVarianceReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		
		var budgetItems []models.BudgetItem
		db.Where("production_id = ?", prodID).Find(&budgetItems)

		report := services.ComputeVariance(budgetItems)
		c.JSON(http.StatusOK, report)
	}
}
