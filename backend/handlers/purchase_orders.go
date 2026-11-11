package handlers

import (
	"net/http"
	"strconv"

	"film-production-erp/models"
	"film-production-erp/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetPOs returns all purchase orders for a production
func GetPOs(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productionID := c.Param("productionId")
		var pos []models.PurchaseOrder
		if err := db.Where("production_id = ?", productionID).Find(&pos).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, pos)
	}
}

// RaisePO creates a new purchase order
func RaisePO(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productionID, _ := strconv.ParseUint(c.Param("productionId"), 10, 32)
		var input struct {
			BudgetItemID uint    `json:"budgetItemId"`
			VendorID     uint    `json:"vendorId"`
			Amount       float64 `json:"amount"`
			TaxAmount    float64 `json:"taxAmount"`
			Description  string  `json:"description"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID := c.GetUint("userID")
		po, err := services.CreatePO(db, uint(productionID), input.BudgetItemID, input.VendorID, userID, input.Amount, input.TaxAmount, input.Description)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		services.GlobalBroker.Broadcast(uint(productionID), "po_created", po)
		c.JSON(http.StatusCreated, po)
	}
}

// GetPO returns a single purchase order
func GetPO(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var po models.PurchaseOrder
		if err := db.First(&po, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "PO not found"})
			return
		}

		orgID, _ := c.Get("orgID")
		var prod models.Production
		if err := db.First(&prod, po.ProductionID).Error; err != nil || prod.OrganizationID != uint(orgID.(float64)) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
		c.JSON(http.StatusOK, po)
	}
}

// ApprovePO approves a purchase order
func ApprovePO(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
		userID := c.GetUint("userID")

		var po models.PurchaseOrder
		if err := db.First(&po, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}

		orgID, _ := c.Get("orgID")
		var prod models.Production
		if err := db.First(&prod, po.ProductionID).Error; err != nil || prod.OrganizationID != uint(orgID.(float64)) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		if err := services.ApprovePO(db, uint(id), userID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		services.GlobalBroker.Broadcast(po.ProductionID, "po_approved", po.ID)
		c.JSON(http.StatusOK, gin.H{"message": "PO approved"})
	}
}

// RejectPO rejects a purchase order
func RejectPO(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
		userID := c.GetUint("userID")
		var input struct {
			Reason string `json:"reason"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			input.Reason = "Rejected"
		}

		var po models.PurchaseOrder
		if err := db.First(&po, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}

		orgID, _ := c.Get("orgID")
		var prod models.Production
		if err := db.First(&prod, po.ProductionID).Error; err != nil || prod.OrganizationID != uint(orgID.(float64)) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		if err := services.RejectPO(db, uint(id), userID, input.Reason); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		services.GlobalBroker.Broadcast(po.ProductionID, "po_rejected", po.ID)
		c.JSON(http.StatusOK, gin.H{"message": "PO rejected"})
	}
}

// ClosePO marks a PO as closed
func ClosePO(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
		userID := c.GetUint("userID")

		var po models.PurchaseOrder
		if err := db.First(&po, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}

		orgID, _ := c.Get("orgID")
		var prod models.Production
		if err := db.First(&prod, po.ProductionID).Error; err != nil || prod.OrganizationID != uint(orgID.(float64)) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		if err := services.ClosePO(db, uint(id), userID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		services.GlobalBroker.Broadcast(po.ProductionID, "po_closed", po.ID)
		c.JSON(http.StatusOK, gin.H{"message": "PO closed"})
	}
}
