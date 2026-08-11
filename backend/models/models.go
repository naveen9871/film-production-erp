package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents an authenticated user
type User struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	Username       string         `gorm:"uniqueIndex" json:"username"`
	Email          string         `gorm:"uniqueIndex" json:"email"`
	Name           string         `json:"name"`
	HashedPassword string         `json:"-"`
	Role           string         `json:"role"` // admin, producer, line_producer, accountant
}

// Production represents a film project
type Production struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	Title        string         `json:"title"`
	Description  string         `json:"description"`
	Genre        string         `json:"genre"`
	BaseCurrency string         `json:"baseCurrency"` // e.g., INR, USD
	TotalBudget  float64        `json:"totalBudget"`
	Status       string         `json:"status"` // draft, in_production, completed
}

// Scene represents a parsed scene from a script
type Scene struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	ProductionID    uint           `json:"productionId"`
	SceneNumber     string         `json:"sceneNumber"`
	Heading         string         `json:"heading"`
	Location        string         `json:"location"`
	TimeOfDay       string         `json:"timeOfDay"`
	IntExt          string         `json:"intExt"`
	IsInterior      bool           `json:"isInterior"`
	IsDay           bool           `json:"isDay"`
	PageLength      float64        `json:"pageLength"`
	Content         string         `json:"content"`
	DialogueSummary string         `json:"dialogueSummary"`
	EstimatedCost   float64        `json:"estimatedCost"`
}

// ProductionElement represents extracted entities (Characters, Locations, Props, etc.)
type ProductionElement struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	ProductionID   uint           `json:"productionId"`
	SceneID        uint           `json:"sceneId"` // Links back to the source scene
	Type           string         `json:"type"`    // Character, Location, Prop, Costume, Equipment
	SubCategory    string         `json:"subCategory"`
	Department     string         `json:"department"`
	Name           string         `json:"name"`
	Details        string         `json:"details"` // JSON string with extended properties
	Mentions       int            `json:"mentions"`
	EstimatedDays  float64        `json:"estimatedDays"` // Estimated shoot days required
	Rate           float64        `json:"rate"`          // Rate per day or fixed cost
	IsAIExtracted  bool           `json:"isAiExtracted"`
	IsUserVerified bool           `json:"isUserVerified"`
}

// BudgetItem represents a line item in the budget
type BudgetItem struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	ProductionID   uint           `json:"productionId"`
	ElementID      uint           `json:"elementId"` // Links to the source element (0 if general)
	SourceEntityID uint           `json:"sourceEntityId"`
	SourceSceneID  uint           `json:"sourceSceneId"`
	SourceScene    string         `json:"sourceScene"` // Cached for easy display
	LifecycleStage string         `json:"lifecycleStage"` // Pre-Production, Production, Post-Production, Marketing
	Department     string         `json:"department"`     // Cast, Locations, Camera, etc.
	Category       string         `json:"category"`       // Sub-category
	CostCategory   string         `json:"costCategory"`
	Description    string         `json:"description"`
	Unit           string         `json:"unit"` // per_day, per_film, per_unit, lump_sum
	Quantity       float64        `json:"quantity"`
	UnitRate       float64        `json:"unitRate"`
	EstimatedCost  float64        `json:"estimatedCost"`
	ActualCost     float64        `json:"actualCost"`
	Variance       float64        `json:"variance"`
	IsManuallySet  bool           `json:"isManuallySet"` // True if set by user override
}

// Expense represents an actual spend record
type Expense struct {
	ID               uint           `gorm:"primarykey" json:"id"`
	ProductionID     uint           `json:"productionId"`
	BudgetItemID     uint           `json:"budgetItemId"`
	TransactionDate  time.Time      `json:"transactionDate"`
	Vendor           string         `json:"vendor"`
	InvoiceNumber    string         `json:"invoiceNumber"`
	InvoiceReference string         `json:"invoiceReference"`
	ReceiptPath      string         `json:"receiptPath"`
	Amount           float64        `json:"amount"`
	TaxAmount        float64        `json:"taxAmount"`
	TotalAmount      float64        `json:"totalAmount"`
	Description      string         `json:"description"`
	Status           string         `json:"status"` // Pending, Paid
	PaymentStatus    string         `json:"paymentStatus"`
}

// RightsRecord represents expected and actual revenue from rights sales
type RightsRecord struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	ProductionID    uint           `json:"productionId"`
	SourceType      string         `json:"sourceType"` // theatrical, ott, satellite, music_rights, tax_credit, government_subsidy
	Category        string         `json:"category"` // Satellite, Audio, Theatrical, OTT, Overseas
	Territory       string         `json:"territory"`
	ExpectedRevenue float64        `json:"expectedRevenue"`
	ActualRevenue   float64        `json:"actualRevenue"`
	Buyer           string         `json:"buyer"`
	Status          string         `json:"status"` // Negotiating, Signed, Received
}

// RateCard represents the configuration for cost estimation
type RateCard struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Name      string         `json:"name"`
	Region    string         `json:"region"`
	Config    string         `json:"config"` // JSON blob
	IsActive  bool           `json:"isActive"`
}
