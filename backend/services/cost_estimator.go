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

func EstimateCostForElement(element models.ProductionElement, scale string, currency string) float64 {
	// Simple lookup based on element type and scale
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
		return 0
	}

	if rateCard, ok := GlobalRateCards[currency]; ok {
		if scales, ok := rateCard.Rates.Departments[dept]; ok {
			if categories, ok := scales[scale]; ok {
				if rate, ok := categories[cat]; ok {
					return rate * element.EstimatedDays
				}
			}
		}
	}
	
	// Fallback heuristic if not in rate card to avoid 0 cost
	if dept == "Art" || dept == "Equipment" || dept == "Crew" {
		return 5000.0 * element.EstimatedDays
	}
	
	return 0
}
