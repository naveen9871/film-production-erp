package services

import (
	"film-production-erp/models"
	"regexp"
	"strings"
	"os"
)

// ExtractEntities processes scenes and extracts characters, locations, and props.
// It will try to use the Gemini AI Orchestrator first, and fallback to regex if no API key is provided.
func ExtractEntities(productionID uint, scenes []models.Scene) []models.ProductionElement {
	// If GEMINI_API_KEY is present, use the Orchestrator
	if os.Getenv("GEMINI_API_KEY") != "" {
		orchestrator := NewAIOrchestrator()
		elements, err := orchestrator.RunExtractionPipeline(productionID, scenes)
		if err == nil && len(elements) > 0 {
			return elements
		}
		// If it failed for some reason, fallback to basic regex
	}

	elementsMap := make(map[string]*models.ProductionElement)
	characterRegex := regexp.MustCompile(`^[A-Z][A-Z\s]+$`)

	for _, scene := range scenes {
		if scene.Location != "" {
			locName := strings.ToUpper(scene.Location)
			if _, exists := elementsMap[locName]; !exists {
				elementsMap[locName] = &models.ProductionElement{
					ProductionID:  productionID,
					SceneID:       scene.ID,
					Type:          "Location",
					Name:          scene.Location,
					Mentions:      0,
					EstimatedDays: 0,
					IsAIExtracted: false,
					IsUserVerified: false,
				}
			}
			elementsMap[locName].Mentions++
			elementsMap[locName].EstimatedDays += 0.5
		}

		lines := strings.Split(scene.Content, "\n")
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" {
				continue
			}

			if characterRegex.MatchString(trimmed) && !strings.Contains(trimmed, "EXT.") && !strings.Contains(trimmed, "INT.") {
				charName := trimmed
				if _, exists := elementsMap[charName]; !exists {
					elementsMap[charName] = &models.ProductionElement{
						ProductionID:  productionID,
						SceneID:       scene.ID,
						Type:          "Character",
						Name:          charName,
						Mentions:      0,
						EstimatedDays: 0,
						IsAIExtracted: false,
						IsUserVerified: false,
					}
				}
				elementsMap[charName].Mentions++
				elementsMap[charName].EstimatedDays += 0.1
			}
		}
	}

	var elements []models.ProductionElement
	for _, el := range elementsMap {
		if el.EstimatedDays < 1 {
			el.EstimatedDays = 1
		}
		elements = append(elements, *el)
	}

	return elements
}
