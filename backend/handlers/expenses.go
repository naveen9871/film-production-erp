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

		// Validate PO if provided
		if expense.POID != 0 {
			var po models.PurchaseOrder
			if err := db.First(&po, expense.POID).Error; err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid PO"})
				return
			}
			if po.Status != "approved" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "PO must be approved before logging expense"})
				return
			}
		}

		if err := db.Create(&expense).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add expense"})
			return
		}

		// Update actual cost on budget item using SQL UPDATE to avoid race conditions
		db.Model(&models.BudgetItem{}).Where("id = ?", expense.BudgetItemID).
			UpdateColumn("actual_cost", gorm.Expr("actual_cost + ?", expense.Amount))

		userID := c.GetUint("userID")
		services.LogAudit(db, userID, "CREATE", "Expense", expense.ID, nil, expense, c.ClientIP())

		services.GlobalBroker.Broadcast(expense.ProductionID, "expense_added", expense)
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

