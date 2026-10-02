package services

import (
	"film-production-erp/models"
	"os"
	"regexp"
	"strings"
)

// ExtractEntities processes scenes and extracts characters, locations, props,
// costumes and equipment. It will try to use the Gemini AI Orchestrator first,
// and fallback to the deterministic rule-based extractor if no API key is
// provided or the orchestrator call fails.
func ExtractEntities(productionID uint, scenes []models.Scene) []models.ProductionElement {
	// If GEMINI_API_KEY is present, use the Orchestrator
	if os.Getenv("GEMINI_API_KEY") != "" {
		orchestrator := NewAIOrchestrator()
		elements, err := orchestrator.RunExtractionPipeline(productionID, scenes)
		if err == nil && len(elements) > 0 {
			return elements
		}
		// If it failed for some reason, fallback to the rule-based extractor
	}

	return ExtractEntitiesRuleBased(productionID, scenes)
}

var characterRegex = regexp.MustCompile(`^[A-Z][A-Z\s]+$`)

// Keyword dictionaries for the rule-based Prop / Costume / Equipment pass.
// This is a lightweight stand-in for the spaCy NER + dependency-parsing pass
// described in the architecture: it scans non-heading, non-character action
// lines for known production-object nouns. It is intentionally offline and
// deterministic, which is what makes it usable as a reproducible validation
// baseline (see ExtractionTestSet in handlers/validation.go).
var propKeywords = []string{
	"gun", "pistol", "revolver", "knife", "sword", "car", "truck", "bike",
	"motorcycle", "phone", "briefcase", "bag", "letter", "bottle", "glass",
	"camera", "laptop", "rope", "key", "box", "umbrella", "watch", "ring",
	"newspaper", "book", "suitcase", "torch", "flashlight",
}
var costumeKeywords = []string{
	"suit", "dress", "uniform", "jacket", "coat", "gown", "armor", "armour",
	"robe", "hat", "mask", "helmet", "turban", "saree", "sari", "veil",
	"cloak", "shawl", "boots", "gloves",
}
var equipmentKeywords = []string{
	"crane", "drone", "jib", "dolly", "rig", "harness", "wire", "greenscreen",
	"green screen", "generator", "tripod", "gimbal", "steadicam", "lights",
	"lighting", "scaffolding", "winch", "trolley",
}

// ExtractEntitiesRuleBased is the deterministic, offline extraction pass
// (scene-heading regex + character-cue regex + keyword-based prop/costume/
// equipment detection). It takes no external dependencies and always
// produces the same output for the same input, which is what makes it
// suitable both as the LLM-fallback path and as the subject of a fixed,
// reproducible ground-truth validation test.
func ExtractEntitiesRuleBased(productionID uint, scenes []models.Scene) []models.ProductionElement {
	elementsMap := make(map[string]*models.ProductionElement)

	upsert := func(key, entType, name string, sceneID uint, dayIncrement float64) {
		if _, exists := elementsMap[key]; !exists {
			elementsMap[key] = &models.ProductionElement{
				ProductionID:   productionID,
				SceneID:        sceneID,
				Type:           entType,
				Name:           name,
				Mentions:       0,
				EstimatedDays:  0,
				IsAIExtracted:  true,
				IsUserVerified: false,
			}
		}
		elementsMap[key].Mentions++
		elementsMap[key].EstimatedDays += dayIncrement
	}

	matchKeyword := func(line string, dict []string) []string {
		lower := strings.ToLower(line)
		var hits []string
		for _, kw := range dict {
			re := regexp.MustCompile(`\b` + regexp.QuoteMeta(kw) + `\b`)
			if re.MatchString(lower) {
				hits = append(hits, kw)
			}
		}
		return hits
	}

	titleCase := func(s string) string {
		if s == "" {
			return s
		}
		return strings.ToUpper(s[:1]) + s[1:]
	}

	for _, scene := range scenes {
		if scene.Location != "" {
			locKey := "LOCATION:" + strings.ToUpper(scene.Location)
			upsert(locKey, "Location", scene.Location, scene.ID, 0.5)
		}

		lines := strings.Split(scene.Content, "\n")
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" {
				continue
			}

			isHeading := strings.Contains(trimmed, "EXT.") || strings.Contains(trimmed, "INT.")

			if characterRegex.MatchString(trimmed) && !isHeading {
				charKey := "CHARACTER:" + trimmed
				upsert(charKey, "Character", trimmed, scene.ID, 0.1)
				continue // character cue lines don't also carry prop/costume text
			}

			if isHeading {
				continue
			}

			for _, kw := range matchKeyword(trimmed, propKeywords) {
				key := "PROP:" + strings.ToUpper(kw)
				upsert(key, "Prop", titleCase(kw), scene.ID, 0.1)
			}
			for _, kw := range matchKeyword(trimmed, costumeKeywords) {
				key := "COSTUME:" + strings.ToUpper(kw)
				upsert(key, "Costume", titleCase(kw), scene.ID, 0.1)
			}
			for _, kw := range matchKeyword(trimmed, equipmentKeywords) {
				key := "EQUIPMENT:" + strings.ToUpper(kw)
				upsert(key, "Equipment", titleCase(kw), scene.ID, 0.1)
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
