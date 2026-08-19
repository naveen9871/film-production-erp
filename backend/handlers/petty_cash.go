package handlers

import (
	"film-production-erp/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func IssueFloat(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		var input models.PettyCashFloat
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		input.ProductionID = 0 // Will overwrite
		db.Model(&models.Production{}).Where("id = ?", prodID).Select("id").Row().Scan(&input.ProductionID)
		
		input.Balance = input.Amount
		input.Status = "Active"
		input.IssuedByID = c.GetUint("userID")

		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue float"})
			return
		}

		c.JSON(http.StatusCreated, input)
	}
}

func GetFloats(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		var floats []models.PettyCashFloat
		if err := db.Where("production_id = ?", prodID).Order("created_at desc").Find(&floats).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get floats"})
			return
		}

		c.JSON(http.StatusOK, floats)
	}
}

func GetFloatReceipts(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		floatID := c.Param("id")
		var receipts []models.PettyCashReceipt
		if err := db.Where("float_id = ?", floatID).Order("transaction_date desc").Find(&receipts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get receipts"})
			return
		}
		c.JSON(http.StatusOK, receipts)
	}
}

func LogFloatReceipt(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		floatID := c.Param("id")
		var input models.PettyCashReceipt
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var pcFloat models.PettyCashFloat
		if err := db.First(&pcFloat, floatID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Float not found"})
			return
		}

		if pcFloat.Status != "Active" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Float is not active"})
			return
		}

		input.FloatID = pcFloat.ID

		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&input).Error; err != nil {
				return err
			}
			
			// Deduct balance
			if err := tx.Model(&pcFloat).Update("balance", gorm.Expr("balance - ?", input.Amount)).Error; err != nil {
				return err
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log receipt"})
			return
		}

		c.JSON(http.StatusCreated, input)
	}
}

func ReconcileFloat(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		floatID := c.Param("id")
		
		err := db.Transaction(func(tx *gorm.DB) error {
			var pcFloat models.PettyCashFloat
			if err := tx.First(&pcFloat, floatID).Error; err != nil {
				return err
			}

			if pcFloat.Status != "Active" {
				return gorm.ErrInvalidData
			}

			var receipts []models.PettyCashReceipt
			if err := tx.Where("float_id = ?", pcFloat.ID).Find(&receipts).Error; err != nil {
				return err
			}

			for _, r := range receipts {
				expense := models.Expense{
					ProductionID:    pcFloat.ProductionID,
					BudgetItemID:    r.BudgetItemID,
					VendorID:        0, 
					TransactionDate: r.TransactionDate,
					Vendor:          r.Vendor,
					Amount:          r.Amount,
					TotalAmount:     r.Amount,
					Description:     "Petty Cash: " + r.Description,
					Status:          "Paid",
					PaymentStatus:   "Paid",
				}

				if err := tx.Create(&expense).Error; err != nil {
					return err
				}

				tx.Model(&models.BudgetItem{}).Where("id = ?", r.BudgetItemID).
					UpdateColumn("actual_cost", gorm.Expr("actual_cost + ?", r.Amount))
			}

			if err := tx.Model(&pcFloat).Updates(map[string]interface{}{"status": "Reconciled"}).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reconcile float"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Float reconciled successfully"})
	}
}
