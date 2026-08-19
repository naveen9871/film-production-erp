package services

import (
	"film-production-erp/models"
)

// ClassifyBudgetLine classifies an element into ATL/BTL structure
func ClassifyBudgetLine(element models.ProductionElement, item *models.BudgetItem) {
	// Above the Line: Story, Producer, Director, Cast
	if element.Type == "Character" {
		item.BudgetLine = "ATL"
		item.ATLCategory = "cast_fee"
		item.Department = "Cast"
		return
	}

	if element.Type == "Rights" {
		item.BudgetLine = "ATL"
		item.ATLCategory = "story_rights"
		item.Department = "Story"
		return
	}

	// Below the line mapping
	item.BudgetLine = "BTL_production"
	
	switch element.Type {
	case "Location":
		item.Department = "Locations"
	case "Prop":
		item.Department = "Art"
	case "Costume":
		item.Department = "Wardrobe"
	case "Equipment":
		item.Department = "Camera/Grip"
	case "Vehicle":
		item.Department = "Transportation"
	case "VFX":
		item.BudgetLine = "BTL_post"
		item.Department = "VFX"
	default:
		item.Department = "Misc"
	}
}
