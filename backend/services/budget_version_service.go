package services

import (
	"encoding/json"
	"errors"
	"time"

	"film-production-erp/models"
	"gorm.io/gorm"
)

// CreateSnapshot creates a new budget snapshot (version)
func CreateSnapshot(db *gorm.DB, productionID uint, label string, notes string) (*models.BudgetVersion, error) {
	// Fetch all current budget items for the production
	var items []models.BudgetItem
	if err := db.Where("production_id = ?", productionID).Find(&items).Error; err != nil {
		return nil, err
	}

	snapshotBytes, err := json.Marshal(items)
	if err != nil {
		return nil, err
	}

	version := models.BudgetVersion{
		ProductionID: productionID,
		VersionLabel: label,
		Status:       "draft",
		SnapshotJSON: string(snapshotBytes),
		Notes:        notes,
	}

	if err := db.Create(&version).Error; err != nil {
		return nil, err
	}

	return &version, nil
}

// LockVersion locks a budget snapshot
func LockVersion(db *gorm.DB, versionID, userID uint) error {
	var version models.BudgetVersion
	if err := db.First(&version, versionID).Error; err != nil {
		return err
	}

	if version.Status == "locked" {
		return errors.New("version is already locked")
	}

	now := time.Now()
	version.Status = "locked"
	version.LockedAt = &now
	version.LockedByID = userID

	if err := db.Save(&version).Error; err != nil {
		return err
	}

	LogAudit(db, userID, "LOCK", "BudgetVersion", version.ID, nil, version, "")
	return nil
}

type VarianceReportItem struct {
	Department    string  `json:"department"`
	BudgetLine    string  `json:"budgetLine"` // ATL, BTL etc.
	Category      string  `json:"category"`
	Description   string  `json:"description"`
	LockedEst     float64 `json:"lockedEst"`
	CurrentActual float64 `json:"currentActual"`
	Variance      float64 `json:"variance"`
}

// GetVarianceReport compares a locked version's estimated costs against current actuals
func GetVarianceReport(db *gorm.DB, versionID uint) ([]VarianceReportItem, error) {
	var version models.BudgetVersion
	if err := db.First(&version, versionID).Error; err != nil {
		return nil, err
	}

	if version.Status != "locked" {
		return nil, errors.New("variance report only available for locked budgets")
	}

	// Unmarshal locked items
	var lockedItems []models.BudgetItem
	if err := json.Unmarshal([]byte(version.SnapshotJSON), &lockedItems); err != nil {
		return nil, err
	}

	// Fetch current actuals (which are updated in real-time on the live BudgetItems)
	var currentItems []models.BudgetItem
	if err := db.Where("production_id = ?", version.ProductionID).Find(&currentItems).Error; err != nil {
		return nil, err
	}

	// Map current items by their original ID or ElementID to match actuals
	// For simplicity, assuming BudgetItem IDs persist across snapshots, or ElementID matching
	actualMap := make(map[uint]float64)
	for _, ci := range currentItems {
		// Use element ID + department + category + description as a soft composite key if IDs change,
		// but since we keep BudgetItems and just snapshot them, ID matching is safest if we don't delete them.
		actualMap[ci.ID] = ci.ActualCost
	}

	var report []VarianceReportItem
	for _, li := range lockedItems {
		actual := actualMap[li.ID] // if ID matches
		variance := li.EstimatedCost - actual
		report = append(report, VarianceReportItem{
			Department:    li.Department,
			BudgetLine:    li.BudgetLine,
			Category:      li.Category,
			Description:   li.Description,
			LockedEst:     li.EstimatedCost,
			CurrentActual: actual,
			Variance:      variance,
		})
	}

	return report, nil
}
