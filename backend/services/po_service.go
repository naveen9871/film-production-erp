package services

import (
	"errors"
	"fmt"
	"time"

	"film-production-erp/models"
	"gorm.io/gorm"
)

// CreatePO generates a new purchase order
func CreatePO(db *gorm.DB, productionID, budgetItemID, vendorID, raisedByID uint, amount float64, taxAmount float64, description string) (*models.PurchaseOrder, error) {
	po := models.PurchaseOrder{
		ProductionID: productionID,
		BudgetItemID: budgetItemID,
		VendorID:     vendorID,
		Description:  description,
		Amount:       amount,
		TaxAmount:    taxAmount,
		Status:       "draft",
		RaisedByID:   raisedByID,
	}

	// Generate PONumber
	var count int64
	db.Model(&models.PurchaseOrder{}).Where("production_id = ?", productionID).Count(&count)
	po.PONumber = fmt.Sprintf("PO-PROD%d-%04d", productionID, count+1)

	if err := db.Create(&po).Error; err != nil {
		return nil, err
	}
	
	// Log audit
	LogAudit(db, raisedByID, "CREATE", "PurchaseOrder", po.ID, nil, po, "")
	return &po, nil
}

// ApprovePO approves a purchase order
func ApprovePO(db *gorm.DB, poID, approverID uint) error {
	var po models.PurchaseOrder
	if err := db.First(&po, poID).Error; err != nil {
		return err
	}

	if po.Status != "draft" && po.Status != "submitted" {
		return errors.New("PO is not in a state that can be approved")
	}

	oldPO := po
	now := time.Now()
	po.Status = "approved"
	po.ApprovedByID = approverID
	po.ApprovedAt = &now

	if err := db.Save(&po).Error; err != nil {
		return err
	}

	LogAudit(db, approverID, "APPROVE", "PurchaseOrder", po.ID, oldPO, po, "")
	return nil
}

// RejectPO rejects a purchase order
func RejectPO(db *gorm.DB, poID, approverID uint, reason string) error {
	var po models.PurchaseOrder
	if err := db.First(&po, poID).Error; err != nil {
		return err
	}

	if po.Status != "draft" && po.Status != "submitted" {
		return errors.New("PO is not in a state that can be rejected")
	}

	oldPO := po
	po.Status = "rejected"
	po.Notes = reason

	if err := db.Save(&po).Error; err != nil {
		return err
	}

	LogAudit(db, approverID, "REJECT", "PurchaseOrder", po.ID, oldPO, po, "")
	return nil
}

// ClosePO marks a PO as closed/invoiced
func ClosePO(db *gorm.DB, poID, userID uint) error {
	var po models.PurchaseOrder
	if err := db.First(&po, poID).Error; err != nil {
		return err
	}

	if po.Status != "approved" {
		return errors.New("only approved POs can be closed")
	}

	oldPO := po
	po.Status = "closed"

	if err := db.Save(&po).Error; err != nil {
		return err
	}

	LogAudit(db, userID, "CLOSE", "PurchaseOrder", po.ID, oldPO, po, "")
	return nil
}
