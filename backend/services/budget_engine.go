package services

import (
	"film-production-erp/models"
)

// GenerateQuote mode: Bottom-up estimation from AI extracted elements
func GenerateQuote(production *models.Production, elements []models.ProductionElement) []models.BudgetItem {
	var budget []models.BudgetItem

	for _, el := range elements {
		cost := EstimateCostForElement(el, production.Scale)
		dept := "Miscellaneous"
		if el.Type == "Character" {
			dept = "Cast"
		} else if el.Type == "Location" {
			dept = "Locations"
		}

		item := models.BudgetItem{
			ProductionID:   production.ID,
			LifecycleStage: "Pre-Production",
			Department:     dept,
			Category:       el.Type,
			Description:    el.Name,
			EstimatedCost:  cost,
		}
		budget = append(budget, item)
	}

	return budget
}

// AllocateBudget mode: Top-down distribution of a fixed total budget
func AllocateBudget(production *models.Production) []models.BudgetItem {
	var budget []models.BudgetItem
	total := production.TotalBudget
	
	allocations, ok := GlobalRateCards.Allocations[production.Genre]
	if !ok {
		// default fallback
		allocations = GlobalRateCards.Allocations["Independent"]
	}

	for stage, percentage := range allocations {
		amount := total * (percentage / 100.0)
		item := models.BudgetItem{
			ProductionID:   production.ID,
			LifecycleStage: stage,
			Department:     "General", // Could be further split
			Category:       "Allocation",
			Description:    stage + " Budget Allocation",
			EstimatedCost:  amount,
		}
		budget = append(budget, item)
	}

	return budget
}
