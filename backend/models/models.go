package models

import (
	"time"

	"gorm.io/gorm"
)

// Production represents a film project
type Production struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Title       string         `json:"title"`
	Genre       string         `json:"genre"`
	Scale       string         `json:"scale"` // Small, Medium, Large
	TotalBudget float64        `json:"totalBudget"`
	Status      string         `json:"status"` // Planning, Pre-Production, Production, Post-Production, Completed
}

// Scene represents a parsed scene from a script
type Scene struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	ProductionID uint           `json:"productionId"`
	SceneNumber  string         `json:"sceneNumber"`
	Heading      string         `json:"heading"`
	Location     string         `json:"location"`
	TimeOfDay    string         `json:"timeOfDay"`
	IntExt       string         `json:"intExt"`
	PageLength   float64        `json:"pageLength"`
	Content      string         `json:"content"`
}

// ProductionElement represents extracted entities (Characters, Locations, Props, etc.)
type ProductionElement struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	ProductionID uint           `json:"productionId"`
	Type         string         `json:"type"` // Character, Location, Prop, Costume, Equipment
	Name         string         `json:"name"`
	Mentions     int            `json:"mentions"`
	EstimatedDays float64       `json:"estimatedDays"` // Estimated shoot days required
	Rate         float64        `json:"rate"` // Rate per day or fixed cost
}

// BudgetItem represents a line item in the budget
type BudgetItem struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	ProductionID   uint           `json:"productionId"`
	LifecycleStage string         `json:"lifecycleStage"` // Pre-Production, Production, Post-Production, Marketing
	Department     string         `json:"department"`     // Cast, Locations, Camera, etc.
	Category       string         `json:"category"`       // Sub-category
	Description    string         `json:"description"`
	EstimatedCost  float64        `json:"estimatedCost"`
	ActualCost     float64        `json:"actualCost"`
	IsManuallySet  bool           `json:"isManuallySet"` // True if set by user override
}

// Expense represents an actual spend record
type Expense struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	ProductionID uint           `json:"productionId"`
	BudgetItemID uint           `json:"budgetItemId"`
	Date         time.Time      `json:"date"`
	Vendor       string         `json:"vendor"`
	InvoiceNumber string        `json:"invoiceNumber"`
	Amount       float64        `json:"amount"`
	Description  string         `json:"description"`
	Status       string         `json:"status"` // Pending, Paid
}

// RightsRecord represents expected and actual revenue from rights sales
type RightsRecord struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	ProductionID    uint           `json:"productionId"`
	Category        string         `json:"category"` // Satellite, Audio, Theatrical, OTT, Overseas
	Territory       string         `json:"territory"`
	ExpectedRevenue float64        `json:"expectedRevenue"`
	ActualRevenue   float64        `json:"actualRevenue"`
	Buyer           string         `json:"buyer"`
	Status          string         `json:"status"` // Negotiating, Signed, Received
}
