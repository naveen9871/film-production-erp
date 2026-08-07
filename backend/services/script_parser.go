package services

import (
	"film-production-erp/models"
	"regexp"
	"strings"
)

var sceneHeadingRegex = regexp.MustCompile(`^(INT\.|EXT\.|INT/EXT\.|I/E)[ \.\-]*(.*?)(?:[-—]+(.*))?$`)

// ParseScript processes raw text and extracts a list of Scenes
func ParseScript(productionID uint, rawText string) []models.Scene {
	var scenes []models.Scene
	lines := strings.Split(rawText, "\n")

	var currentScene *models.Scene
	var sceneContent strings.Builder

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		// Check for scene heading
		matches := sceneHeadingRegex.FindStringSubmatch(strings.ToUpper(trimmed))
		if len(matches) > 0 {
			// Save previous scene
			if currentScene != nil {
				currentScene.Content = sceneContent.String()
				currentScene.PageLength = float64(len(strings.Split(currentScene.Content, "\n"))) / 55.0 // Rough estimate: 55 lines per page
				scenes = append(scenes, *currentScene)
			}

			// Start new scene
			currentScene = &models.Scene{
				ProductionID: productionID,
				Heading:      trimmed,
				IntExt:       strings.TrimSpace(matches[1]),
				Location:     strings.TrimSpace(matches[2]),
				TimeOfDay:    strings.TrimSpace(matches[3]),
			}
			sceneContent.Reset()
		}

		if currentScene != nil {
			sceneContent.WriteString(line + "\n")
		}
	}

	// Save last scene
	if currentScene != nil {
		currentScene.Content = sceneContent.String()
		currentScene.PageLength = float64(len(strings.Split(currentScene.Content, "\n"))) / 55.0
		scenes = append(scenes, *currentScene)
	}

	return scenes
}
