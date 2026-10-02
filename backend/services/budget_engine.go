package services

import (
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

	scale := DeriveProductionScale(production.PredictedShootDays)
	btlTotal := 0.0

	for _, el := range elements {
		_, unitRate := EstimateCostForElement(el, scale, currency)

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
			LifecycleStage: "Pre-Production", // Can be overridden below
			Category:       el.Type,
			CostCategory:   el.SubCategory,
			Description:    el.Name,
			Unit:           "per_day",
			Quantity:       el.EstimatedDays,
			UnitRate:       unitRate,
		}

		// Classify into ATL/BTL structure
		ClassifyBudgetLine(el, &item)

		// Set LifecycleStage based on BudgetLine
		if item.BudgetLine == "ATL" {
			item.LifecycleStage = "Pre-Production"
		} else if item.BudgetLine == "BTL_post" {
			item.LifecycleStage = "Post-Production"
		} else {
			item.LifecycleStage = "Production"
		}

		// Calculate Fringes
		CalculateFringes(&item, rateCard)

		// Override estimated cost if base multiplier exists
		if rateCard != nil && rateCard.BaseMultiplier > 0 {
			// Cost was already unitRate * quantity + fringe in CalculateFringes
			// We just multiply unit rate here and let CalculateFringes re-evaluate it
			item.UnitRate *= rateCard.BaseMultiplier
			CalculateFringes(&item, rateCard)
		}

		if item.BudgetLine != "ATL" {
			btlTotal += item.EstimatedCost
		}

		budget = append(budget, item)
	}

	// Add Contingency line item (10% of BTL)
	contingencyAmount := btlTotal * 0.10
	if contingencyAmount > 0 {
		contingencyItem := models.BudgetItem{
			ProductionID:   production.ID,
			LifecycleStage: "Production",
			BudgetLine:     "BTL_other",
			Department:     "General",
			Category:       "Contingency",
			Description:    "10% Contingency on BTL",
			Unit:           "lump_sum",
			Quantity:       1,
			UnitRate:       contingencyAmount,
			EstimatedCost:  contingencyAmount,
			Contingency:    contingencyAmount,
		}
		budget = append(budget, contingencyItem)
	}

	return budget
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
			Department:     "General",
			Category:       "Allocation",
			Description:    stage + " Budget Allocation",
			EstimatedCost:  amount,
		}
		budget = append(budget, item)
	}

	return budget
}

