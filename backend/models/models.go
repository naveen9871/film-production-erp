package models

import (
	"time"

	"gorm.io/gorm"
)

// Organization represents a multi-tenant client or production house
type Organization struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Name      string         `gorm:"uniqueIndex" json:"name"`
	GSTIN     string         `json:"gstin"` // Master GSTIN
}

// User represents an authenticated user
type User struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	OrganizationID uint           `json:"organizationId"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	Username       string         `gorm:"uniqueIndex" json:"username"`
	Email          string         `gorm:"uniqueIndex" json:"email"`
	Name           string         `json:"name"`
	HashedPassword string         `json:"-"`
	Role           string         `json:"role"` // admin, producer, line_producer, accountant, dept_head
	Department     string         `json:"department"`
	Permissions    string         `json:"permissions"` // JSON array
}

// Production represents a film project
type Production struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	OrganizationID uint           `json:"organizationId"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	Title        string         `json:"title"`
	Description  string         `json:"description"`
	Genre        string         `json:"genre"`
	BaseCurrency string         `json:"baseCurrency"` // e.g., INR, USD
	TotalBudget  float64        `json:"totalBudget"`
	Status       string         `json:"status"` // draft, in_production, completed

	// Shoot-day prediction: model-estimated total shoot days from script-derived
	// entity counts (see services.PredictShootDays), and the producer-adjusted
	// figure used for actual scheduling. See /validation/shoot-day-model for
	// the model's cross-validated accuracy.
	PredictedShootDays float64 `json:"predictedShootDays"`
	ActualShootDays    float64 `json:"actualShootDays"` // producer override / real schedule length
}

// Scene represents a parsed scene from a script
type Scene struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	ProductionID    uint           `json:"productionId"`
	ScriptVersionID uint           `json:"scriptVersionId"`
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
	ID              uint           `gorm:"primarykey" json:"id"`
	ProductionID    uint           `json:"productionId"`
	ScriptVersionID uint           `json:"scriptVersionId"`
	SceneID         uint           `json:"sceneId"` // Links back to the source scene
	Type           string         `json:"type"`    // Character, Location, Prop, Costume, Equipment, VFX, Vehicle
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

// ShootDay represents a scheduled shoot day for an entity
type ShootDay struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	ProductionID  uint      `json:"productionId"`
	SceneID       uint      `json:"sceneId"`
	ElementID     uint      `json:"elementId"` // Which entity (actor, location) is scheduled
	ScheduledDate time.Time `json:"scheduledDate"`
	DayNumber     int       `json:"dayNumber"` // Shoot day number (D01, D02...)
	CallTime      string    `json:"callTime"`
	Status        string    `json:"status"`    // planned, shot, cancelled
}

// BudgetVersion represents a snapshot of the budget
type BudgetVersion struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	ProductionID uint      `json:"productionId"`
	VersionLabel string    `json:"versionLabel"` // e.g., "v1-initial", "v2-locked", "actuals"
	Status       string    `json:"status"`       // draft, locked, archived
	LockedAt     *time.Time `json:"lockedAt"`
	LockedByID   uint      `json:"lockedById"`
	SnapshotJSON string    `json:"snapshotJson"` // Full JSON blob of all BudgetItems at lock time
	Notes        string    `json:"notes"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// BudgetItem represents a line item in the budget
type BudgetItem struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	ProductionID    uint           `json:"productionId"`
	BudgetVersionID uint           `json:"budgetVersionId"`
	ElementID       uint           `json:"elementId"` // Links to the source element (0 if general)
	SourceEntityID  uint           `json:"sourceEntityId"`
	SourceSceneID   uint           `json:"sourceSceneId"`
	SourceScene     string         `json:"sourceScene"` // Cached for easy display
	LifecycleStage  string         `json:"lifecycleStage"` // Pre-Production, Production, Post-Production, Marketing
	BudgetLine      string         `json:"budgetLine"`     // ATL, BTL_production, BTL_post, BTL_other
	ATLCategory     string         `json:"atlCategory"`    // story_rights, producer_fee, director_fee, cast_fee
	Department      string         `json:"department"`     // Cast, Locations, Camera, etc.
	Category        string         `json:"category"`       // Sub-category
	CostCategory    string         `json:"costCategory"`
	Description     string         `json:"description"`
	Unit            string         `json:"unit"` // per_day, per_film, per_unit, lump_sum
	Quantity        float64        `json:"quantity"`
	UnitRate        float64        `json:"unitRate"`
	FringeRate      float64        `json:"fringeRate"`   // e.g., 0.20 for 20%
	FringeAmount    float64        `json:"fringeAmount"` // Calculated Fringe
	EstimatedCost   float64        `json:"estimatedCost"` // Base + Fringe
	ActualCost      float64        `json:"actualCost"`
	Contingency     float64        `json:"contingency"`
	Variance        float64        `json:"variance"`
	IsManuallySet   bool           `json:"isManuallySet"` // True if set by user override
}

// Vendor represents a vendor master record
type Vendor struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	OrganizationID  uint           `json:"organizationId"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	Name            string         `gorm:"uniqueIndex" json:"name"`
	ContactPerson   string         `json:"contactPerson"`
	Email           string         `json:"email"`
	Phone           string         `json:"phone"`
	GSTNumber       string         `json:"gstNumber"` // Tax ID
	PAN             string         `json:"pan"`
	BankName        string         `json:"bankName"`
	BankAccount     string         `json:"bankAccount"`
	BankIFSC        string         `json:"bankIfsc"`
	DefaultPayTerms int            `json:"defaultPayTerms"` // Days
	Category        string         `json:"category"`        // crew, rental, location, catering, transport
}

// PurchaseOrder represents an approval workflow item
type PurchaseOrder struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	ProductionID uint           `json:"productionId"`
	BudgetItemID uint           `json:"budgetItemId"`
	VendorID     uint           `json:"vendorId"`
	PONumber     string         `gorm:"uniqueIndex" json:"poNumber"`
	Description  string         `json:"description"`
	Amount       float64        `json:"amount"`
	TaxAmount    float64        `json:"taxAmount"`
	Status       string         `json:"status"` // draft, submitted, approved, rejected, invoiced, closed
	RaisedByID   uint           `json:"raisedById"`
	ApprovedByID uint           `json:"approvedById"`
	ApprovedAt   *time.Time      `json:"approvedAt"`
	Notes        string         `json:"notes"`
}

// Expense represents an actual spend record
type Expense struct {
	ID               uint           `gorm:"primarykey" json:"id"`
	ProductionID     uint           `json:"productionId"`
	BudgetItemID     uint           `json:"budgetItemId"`
	VendorID         uint           `json:"vendorId"`
	POID             uint           `json:"poId"`
	TransactionDate  time.Time      `json:"transactionDate"`
	Vendor           string         `json:"vendor"` // Legacy, kept for fallback
	InvoiceNumber    string         `json:"invoiceNumber"`
	InvoiceReference string         `json:"invoiceReference"`
	ReceiptPath      string         `json:"receiptPath"`
	Amount           float64        `json:"amount"`
	TaxAmount        float64        `json:"taxAmount"`
	TaxRate          float64        `json:"taxRate"`
	TaxType          string         `json:"taxType"` // CGST_SGST, IGST, TDS
	TotalAmount      float64        `json:"totalAmount"`
	Description      string         `json:"description"`
	Status           string         `json:"status"` // Pending, Paid
	PaymentStatus    string         `json:"paymentStatus"`
	IsVoided         bool           `json:"isVoided"`
	VoidReason       string         `json:"voidReason"`
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
	ID             uint           `gorm:"primarykey" json:"id"`
	OrganizationID uint           `json:"organizationId"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	Name           string         `json:"name"`
	Region         string         `json:"region"`
	Config         string         `json:"config"` // JSON blob
	IsActive       bool           `json:"isActive"`
	BaseMultiplier float64        `json:"baseMultiplier"`
	Currency       string         `json:"currency"`
	DepartmentsData string         `json:"departmentsData"` // JSON blob
	FringeRates    string         `json:"fringeRates"`     // JSON blob {"crew": 0.32, "cast": 0.18}
}

// AuditLog tracks who did what
type AuditLog struct {
	ID             uint      `gorm:"primarykey" json:"id"`
	OrganizationID uint      `json:"organizationId"`
	UserID         uint      `json:"userId"`
	Action         string    `json:"action"` // CREATE, UPDATE, DELETE, APPROVE
	EntityType     string    `json:"entityType"`
	EntityID       uint      `json:"entityId"`
	OldValue       string    `json:"oldValue"` // JSON representation
	NewValue       string    `json:"newValue"` // JSON representation
	IPAddress      string    `json:"ipAddress"`
	CreatedAt      time.Time `json:"createdAt"`
}

// ScriptVersion represents a revision of a script
type ScriptVersion struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	ProductionID uint           `json:"productionId"`
	Version      int            `json:"version"`
	Label        string         `json:"label"` // e.g., "Draft 1", "Shooting Script"
	CreatedAt    time.Time      `json:"createdAt"`
}

// ScriptDiff represents changes between two script versions
type ScriptDiff struct {
	ID              uint      `gorm:"primarykey" json:"id"`
	ProductionID    uint      `json:"productionId"`
	BaseVersionID   uint      `json:"baseVersionId"`
	TargetVersionID uint      `json:"targetVersionId"`
	AddedScenes     int       `json:"addedScenes"`
	RemovedScenes   int       `json:"removedScenes"`
	ModifiedScenes  int       `json:"modifiedScenes"`
	AddedElements   int       `json:"addedElements"`
	RemovedElements int       `json:"removedElements"`
	DiffDetails     string    `json:"diffDetails"` // JSON of detailed changes
	CreatedAt       time.Time `json:"createdAt"`
}

// ------------------------------------------------------------------------
// PHASE 5: INDIA-FIRST DIFFERENTIATORS (REVENUE, ARTISTS, EQUIPMENT)
// ------------------------------------------------------------------------

// Distributor represents a film distributor or OTT platform
type Distributor struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	OrganizationID uint           `json:"organizationId"`
	Name           string         `json:"name"`
	ContactPerson  string         `json:"contactPerson"`
	Email          string         `json:"email"`
	Phone          string         `json:"phone"`
	PlatformType   string         `json:"platformType"` // OTT, Theatrical, Satellite, Audio
	CreatedAt      time.Time      `json:"createdAt"`
}

// DistributionAgreement represents a deal made for a specific territory/right
type DistributionAgreement struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	ProductionID uint      `json:"productionId"`
	DistributorID uint     `json:"distributorId"`
	Territory    string    `json:"territory"`   // Nizam, Overseas, Hindi Dub, All India
	RightsType   string    `json:"rightsType"`  // Theatrical, OTT, Satellite, Audio
	AgreedAmount float64   `json:"agreedAmount"`
	Status       string    `json:"status"`      // Signed, In-Negotiation, Terminated
	Notes        string    `json:"notes"`
	CreatedAt    time.Time `json:"createdAt"`
}

// RevenueEntry represents payments received against a distribution agreement
type RevenueEntry struct {
	ID                      uint      `gorm:"primarykey" json:"id"`
	DistributionAgreementID uint      `json:"distributionAgreementId"`
	AmountReceived          float64   `json:"amountReceived"`
	ReceiptDate             time.Time `json:"receiptDate"`
	TransactionRef          string    `json:"transactionRef"`
	CreatedAt               time.Time `json:"createdAt"`
}

// ArtistContract represents the financial agreement for an actor/technician
type ArtistContract struct {
	ID                  uint      `gorm:"primarykey" json:"id"`
	ProductionID        uint      `json:"productionId"`
	ProductionElementID uint      `json:"productionElementId"` // The actual Artist/Character
	TotalFee            float64   `json:"totalFee"`
	AdvancePaid         float64   `json:"advancePaid"`
	Status              string    `json:"status"` // Active, Completed
	CreatedAt           time.Time `json:"createdAt"`
}

// ArtistPayment tracks tranches paid to an artist
type ArtistPayment struct {
	ID               uint      `gorm:"primarykey" json:"id"`
	ArtistContractID uint      `json:"artistContractId"`
	Amount           float64   `json:"amount"`
	PaymentDate      time.Time `json:"paymentDate"`
	Notes            string    `json:"notes"`
	CreatedAt        time.Time `json:"createdAt"`
}

// EquipmentRental tracks rental duration and cost
type EquipmentRental struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	ProductionID uint      `json:"productionId"`
	VendorID     uint      `json:"vendorId"`
	Equipment    string    `json:"equipment"`
	StartDate    time.Time `json:"startDate"`
	EndDate      *time.Time `json:"endDate"`
	BillingType  string    `json:"billingType"` // Daily, Weekly, LumpSum
	Rate         float64   `json:"rate"`
	Status       string    `json:"status"` // Active, Returned
	CreatedAt    time.Time `json:"createdAt"`
}

// DamageReport tracks equipment damage and estimated costs
type DamageReport struct {
	ID                  uint      `gorm:"primarykey" json:"id"`
	EquipmentRentalID   uint      `json:"equipmentRentalId"`
	Description         string    `json:"description"`
	EstimatedRepairCost float64   `json:"estimatedRepairCost"`
	Status              string    `json:"status"` // Reported, Resolved, Deducted
	CreatedAt           time.Time `json:"createdAt"`
}

// ------------------------------------------------------------------------
// PHASE 6: WRITER'S ROOM AI STUDIO
// ------------------------------------------------------------------------

// StoryDocument represents a live screenplay/story being written in the platform
type StoryDocument struct {
	ID             uint      `gorm:"primarykey" json:"id"`
	OrganizationID uint      `json:"organizationId"`
	ProductionID   uint      `json:"productionId"` // 0 if standalone
	Title          string    `json:"title"`
	DocType        string    `json:"docType"` // Screenplay, Story, Treatment
	ContentJSON    string    `json:"contentJson"` // Rich text JSON from TipTap
	Genre          string    `json:"genre"`
	Tone           string    `json:"tone"`
	Status         string    `json:"status"` // Draft, Review, Committed
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// DocumentComment represents an inline comment in the StoryDocument
type DocumentComment struct {
	ID             uint      `gorm:"primarykey" json:"id"`
	StoryDocumentID uint     `json:"storyDocumentId"`
	AuthorID       uint      `json:"authorId"`
	AuthorName     string    `json:"authorName"`
	BlockID        string    `json:"blockId"` // The UUID of the TipTap block
	Content        string    `json:"content"`
	Resolved       bool      `json:"resolved"`
	CreatedAt      time.Time `json:"createdAt"`
}

// FXRate represents exchange rates between currencies
type FXRate struct {
	ID             uint      `gorm:"primarykey" json:"id"`
	OrganizationID uint      `json:"organizationId"`
	BaseCurrency  string    `json:"baseCurrency"` // e.g., INR
	ToCurrency    string    `json:"toCurrency"`   // e.g., USD
	Rate          float64   `json:"rate"`         // 1 INR = X USD
	EffectiveDate time.Time `json:"effectiveDate"`
	Source        string    `json:"source"`       // manual, openexchangerates
}

// PettyCashFloat represents a cash float issued to a crew member
type PettyCashFloat struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	ProductionID uint           `json:"productionId"`
	IssuedTo     string         `json:"issuedTo"` // E.g. "Art Dept", "Location Manager"
	IssuedByID   uint           `json:"issuedById"`
	Amount       float64        `json:"amount"`
	Balance      float64        `json:"balance"`
	Status       string         `json:"status"` // Active, Reconciled, Closed
	Notes        string         `json:"notes"`
}

// PettyCashReceipt represents a receipt logged against a float
type PettyCashReceipt struct {
	ID              uint      `gorm:"primarykey" json:"id"`
	FloatID         uint      `json:"floatId"`
	BudgetItemID    uint      `json:"budgetItemId"` // Which budget item this expense hits
	Amount          float64   `json:"amount"`
	Vendor          string    `json:"vendor"`
	Description     string    `json:"description"`
	TransactionDate time.Time `json:"transactionDate"`
	ReceiptPath     string    `json:"receiptPath"`
}
