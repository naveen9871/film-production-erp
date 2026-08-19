package services

import (
	"encoding/json"

	"film-production-erp/models"
)

// CalculateFringes applies fringe percentages per department based on the rate card config
func CalculateFringes(item *models.BudgetItem, rateCard *models.RateCard) {
	if rateCard == nil || rateCard.FringeRates == "" {
		item.FringeRate = 0
		item.FringeAmount = 0
		item.EstimatedCost = (item.UnitRate * item.Quantity)
		return
	}

	// fringeRates map: e.g., {"cast": 0.18, "locations": 0.10, "crew": 0.32}
	var fringes map[string]float64
	if err := json.Unmarshal([]byte(rateCard.FringeRates), &fringes); err != nil {
		item.FringeRate = 0
		item.FringeAmount = 0
		item.EstimatedCost = (item.UnitRate * item.Quantity)
		return
	}

	// Match by exact department name (lowercased key matching can be added if needed)
	fringePct, exists := fringes[item.Department]
	if !exists {
		// Try broad categories if exact dept isn't found
		if item.BudgetLine == "ATL" {
			fringePct = fringes["atl"]
		} else {
			fringePct = fringes["btl"] // fallback
		}
	}

	baseCost := item.UnitRate * item.Quantity
	item.FringeRate = fringePct
	item.FringeAmount = baseCost * fringePct
	item.EstimatedCost = baseCost + item.FringeAmount
}
