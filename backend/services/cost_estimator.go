package services

import (
	"encoding/json"
	"film-production-erp/models"
	"os"
)

type RateCard struct {
	Currency   string `json:"currency"`
	Unit       string `json:"unit"`
	Multiplier int    `json:"multiplier"`
	Rates      struct {
		Departments map[string]map[string]map[string]float64 `json:"departments"`
	} `json:"rates"`
	Allocations map[string]map[string]float64 `json:"allocations"`
}

var GlobalRateCards map[string]RateCard

func LoadRateCards() error {
	data, err := os.ReadFile("data/rate_cards.json")
	if err != nil {
		return err
	}
	err = json.Unmarshal(data, &GlobalRateCards)
	return err
}

// EstimateCostForElement returns (cost, unitRate) for one extracted entity,
// looking up a department/scale/category rate from the loaded rate card.
// scale is "Small", "Medium", or "Large" — see DeriveProductionScale.
func EstimateCostForElement(element models.ProductionElement, scale string, currency string) (float64, float64) {
	dept := ""
	cat := ""

	switch element.Type {
	case "Character":
		dept = "Cast"
		cat = "Supporting" // default
		if element.Mentions > 20 {
			cat = "Lead"
		} else if element.Mentions < 5 {
			cat = "Background"
		}
	case "Location":
		dept = "Locations"
		cat = "DayRate"
	case "Equipment":
		dept = "Equipment"
		cat = "Camera" // default
	case "Prop", "Costume":
		dept = "Art"
		cat = element.Type
	case "Crew":
		dept = "Crew"
		cat = "Daily"
	default:
		return 0, 0
	}

	if rateCard, ok := GlobalRateCards[currency]; ok {
		if scales, ok := rateCard.Rates.Departments[dept]; ok {
			if categories, ok := scales[scale]; ok {
				if rate, ok := categories[cat]; ok {
					// Rate card values are denominated in the card's stated
					// unit (e.g. "Lakhs" for INR, multiplier 100000) — apply
					// the multiplier to get actual currency, not raw Lakhs.
					multiplier := float64(rateCard.Multiplier)
					if multiplier <= 0 {
						multiplier = 1
					}
					actualRate := rate * multiplier
					return actualRate * element.EstimatedDays, actualRate
				}
			}
		}
	}

	// Fallback if the rate card failed to load or has no entry for this
	// department/scale/category — every entity type falls through to a flat
	// default rather than silently costing ₹0, which would be a confusing,
	// hard-to-diagnose failure in a live demo.
	const fallbackRate = 5000.0
	return fallbackRate * element.EstimatedDays, fallbackRate
}

// DeriveProductionScale buckets a production into Small/Medium/Large based
// on its predicted shoot-day count (see services.PredictShootDays), so cost
// estimation can pick the right rate-card tier without requiring the
// producer to manually classify the production before a budget exists.
// Thresholds are informed by the 100-film benchmark's budget-category shoot
// day ranges (see benchmark_films.csv) and are a documented heuristic, not
// a separately validated model.
func DeriveProductionScale(predictedShootDays float64) string {
	switch {
	case predictedShootDays >= 150:
		return "Large"
	case predictedShootDays >= 60:
		return "Medium"
	default:
		return "Small"
	}
}
