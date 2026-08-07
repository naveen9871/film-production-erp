package services

import (
	"film-production-erp/models"
	"regexp"
	"strings"
)

// ExtractEntities processes scenes and extracts characters, locations, and props.
// Using regex and simple heuristics as a proxy for an NLP model.
func ExtractEntities(productionID uint, scenes []models.Scene) []models.ProductionElement {
	elementsMap := make(map[string]*models.ProductionElement)

	// Regex to match uppercase words for character dialogue
	characterRegex := regexp.MustCompile(`^[A-Z][A-Z\s]+$`)

	for _, scene := range scenes {
		// Extract location from scene heading
		if scene.Location != "" {
			locName := strings.ToUpper(scene.Location)
			if _, exists := elementsMap[locName]; !exists {
				elementsMap[locName] = &models.ProductionElement{
					ProductionID:  productionID,
					Type:          "Location",
					Name:          scene.Location, // Keep original casing if possible, but we use upper for key
					Mentions:      0,
					EstimatedDays: 0,
				}
			}
			elementsMap[locName].Mentions++
			elementsMap[locName].EstimatedDays += 0.5 // Rough estimate
		}

		// Parse lines for characters and props
		lines := strings.Split(scene.Content, "\n")
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" {
				continue
			}

			// Simple character heuristic: line is all caps and not a scene heading
			if characterRegex.MatchString(trimmed) && !strings.Contains(trimmed, "EXT.") && !strings.Contains(trimmed, "INT.") {
				charName := trimmed
				if _, exists := elementsMap[charName]; !exists {
					elementsMap[charName] = &models.ProductionElement{
						ProductionID:  productionID,
						Type:          "Character",
						Name:          charName,
						Mentions:      0,
						EstimatedDays: 0,
					}
				}
				elementsMap[charName].Mentions++
				elementsMap[charName].EstimatedDays += 0.1 // Rough estimate per line/mention
			}
		}
	}

	var elements []models.ProductionElement
	for _, el := range elementsMap {
		// Ceiling for estimated days
		if el.EstimatedDays < 1 {
			el.EstimatedDays = 1
		}
		elements = append(elements, *el)
	}

	return elements
}
