package services

import (
	"encoding/json"
	"fmt"
	"film-production-erp/models"
	"gorm.io/gorm"
)

// GenerateQuote mode: Bottom-up estimation from AI extracted elements
func GenerateQuote(db *gorm.DB, production *models.Production, elements []models.ProductionElement, rateCard *models.RateCard) []models.BudgetItem {
	var budget []models.BudgetItem

	currency := production.BaseCurrency
	if currency == "" {
		currency = "INR"
	}

	// Parse rate card config
	var rcConfig map[string]interface{}
	if rateCard != nil && rateCard.Config != "" {
		json.Unmarshal([]byte(rateCard.Config), &rcConfig)
	}

	for _, el := range elements {
		cost, unitRate := EstimateCostForElementDB(el, currency, rcConfig)
		
		sourceScene := ""
		if el.SceneID != 0 {
			sourceScene = fmt.Sprintf("Scene ID: %d", el.SceneID)
		}

		item := models.BudgetItem{
			ProductionID:   production.ID,
			ElementID:      el.ID,
			SourceEntityID: el.ID,
			SourceSceneID:  el.SceneID,
			SourceScene:    sourceScene,
			LifecycleStage: "Pre-Production",
			Department:     el.Department,
			Category:       el.Type,
			CostCategory:   el.SubCategory,
			Description:    el.Name,
			Unit:           "per_day",
			Quantity:       el.EstimatedDays,
			UnitRate:       unitRate,
			EstimatedCost:  cost,
		}
		budget = append(budget, item)
	}

	return budget
}

// EstimateCostForElementDB calculates cost based on rate card JSON config
func EstimateCostForElementDB(element models.ProductionElement, currency string, rcConfig map[string]interface{}) (float64, float64) {
	// Simple fallback heuristic if rate card is missing
	unitRate := 5000.0 // Default 5k

	// In a real scenario, we'd traverse the parsed JSON rate card based on department/type
	// For now, returning heuristic
	
	cost := unitRate * element.EstimatedDays
	return cost, unitRate
}

// AllocateBudget mode: Top-down distribution of a fixed total budget
func AllocateBudget(production *models.Production, rateCard *models.RateCard) []models.BudgetItem {
	var budget []models.BudgetItem
	total := production.TotalBudget
	
	currency := production.BaseCurrency
	if currency == "" {
		currency = "INR"
	}

	allocations := map[string]float64{
		"PreProduction": 10.0,
		"Production": 40.0,
		"PostProduction": 20.0,
		"Marketing": 30.0,
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

