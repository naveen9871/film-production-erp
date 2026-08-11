package services

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"

	"film-production-erp/models"

	"github.com/agnivade/levenshtein"
)

type AIOrchestrator struct {
	client *AIClient
}

func NewAIOrchestrator() *AIOrchestrator {
	return &AIOrchestrator{
		client: NewAIClient(),
	}
}

// ExtractedEntity matches the JSON structure expected from the LLM
type ExtractedEntity struct {
	Name         string   `json:"name"`
	Type         string   `json:"type"` // Expected to be overridden by the stage
	SubCategory  string   `json:"subCategory,omitempty"`
	Scenes       []string `json:"scenes"`
	Mentions     int      `json:"mentions,omitempty"`
	Details      string   `json:"details,omitempty"`
	Requirements string   `json:"requirements,omitempty"`
}

// RunExtractionPipeline runs the 5-stage parallel extraction pipeline
func (o *AIOrchestrator) RunExtractionPipeline(productionID uint, scenes []models.Scene) ([]models.ProductionElement, error) {
	if o.client.APIKey == "" {
		log.Println("No API key, falling back to regex extraction")
		return ExtractEntities(productionID, scenes), nil
	}

	// 1. Prepare text context from scenes
	var scriptContext strings.Builder
	for _, s := range scenes {
		scriptContext.WriteString(fmt.Sprintf("SCENE %s: %s\n%s\n\n", s.SceneNumber, s.Heading, s.Content))
	}
	contextText := scriptContext.String()

	// 2. Parallel extraction
	var wg sync.WaitGroup
	resultsChan := make(chan []ExtractedEntity, 7)
	errorsChan := make(chan error, 7)

	extractionTasks := []struct {
		name   string
		prompt string
	}{
		{
			name:   "Characters",
			prompt: "Analyze this screenplay and extract every character. For each character, classify subCategory as: 'lead','supporting','cameo','background', or 'junior_artist'. Also estimate: (1) scenes they appear in (array of scene numbers), (2) details (any special requirements like stunts, makeup).",
		},
		{
			name:   "Locations",
			prompt: "Extract all unique locations from this screenplay. For each: name, scenes used in, details (permits, generators, security).",
		},
		{
			name:   "Props",
			prompt: "Extract all props and set dressing items from this screenplay. For each: name, scenes used in, subCategory (handheld/set_decoration/special_prop).",
		},
		{
			name:   "Costumes",
			prompt: "Extract all costume and wardrobe requirements. For each: name (item description), scenes used in, details (character name, period, damage).",
		},
		{
			name:   "Equipment",
			prompt: "Identify all technical equipment requirements (camera types, lighting, special rigs, sound). Infer from action descriptions (e.g., 'aerial shot' -> drone). For each: name, scenes used in, details.",
		},
		{
			name:   "Vehicles",
			prompt: "Extract all vehicles mentioned. For each: name, scenes used in, details (character association, action vehicles).",
		},
		{
			name:   "VFX",
			prompt: "Identify all visual effects, stunt sequences, and special requirements. For each: name, scenes used in, details (complexity: simple/moderate/complex).",
		},
	}

	for _, task := range extractionTasks {
		wg.Add(1)
		go func(t struct{ name, prompt string }) {
			defer wg.Done()
			
			fullPrompt := fmt.Sprintf(`You are a film production AI assistant. Analyze the following screenplay excerpt and extract the requested information. Be precise and comprehensive.
			
Screenplay:
%s

Extraction Task: %s

Output Format: Return ONLY a valid JSON array of objects with this structure (no markdown tags, just raw JSON array):
[
  {
    "name": "Entity Name",
    "subCategory": "classification if applicable",
    "scenes": ["1", "2", "3"],
    "details": "any special notes"
  }
]
`, contextText, t.prompt)

			response, err := o.client.GenerateContent(fullPrompt)
			if err != nil {
				errorsChan <- fmt.Errorf("%s extraction failed: %w", t.name, err)
				return
			}

			var extracted []ExtractedEntity
			if err := json.Unmarshal([]byte(response), &extracted); err != nil {
				errorsChan <- fmt.Errorf("%s parsing failed: %w. Raw: %s", t.name, err, response)
				return
			}

			// Tag with type
			entityType := strings.TrimSuffix(t.name, "s") // Characters -> Character
			if t.name == "VFX" {
				entityType = "VFX"
			}
			for i := range extracted {
				extracted[i].Type = entityType
			}

			resultsChan <- extracted
		}(task)
	}

	// Wait and close channels
	go func() {
		wg.Wait()
		close(resultsChan)
		close(errorsChan)
	}()

	// Collect results
	var allEntities []ExtractedEntity
	for res := range resultsChan {
		allEntities = append(allEntities, res...)
	}

	for err := range errorsChan {
		log.Printf("AI Orchestration Error: %v\n", err)
	}

	// 3. Deduplication and normalization
	normalized := o.deduplicateAndNormalize(allEntities)

	// 4. Map to DB models
	var finalElements []models.ProductionElement
	for _, ent := range normalized {
		// Calculate shoot days based on scene count roughly
		days := float64(len(ent.Scenes)) * 0.5
		if days < 1 {
			days = 1
		}

		dept := o.assignDepartment(ent.Type)

		finalElements = append(finalElements, models.ProductionElement{
			ProductionID:   productionID,
			Type:           ent.Type,
			SubCategory:    ent.SubCategory,
			Department:     dept,
			Name:           ent.Name,
			Details:        ent.Details,
			Mentions:       len(ent.Scenes), // Simplified proxy for mentions
			EstimatedDays:  days,
			IsAIExtracted:  true,
			IsUserVerified: false,
		})
	}

	return finalElements, nil
}

func (o *AIOrchestrator) deduplicateAndNormalize(entities []ExtractedEntity) []ExtractedEntity {
	var deduped []ExtractedEntity

	for _, e := range entities {
		e.Name = strings.TrimSpace(e.Name)
		if e.Name == "" {
			continue
		}

		// Look for duplicates in deduped list
		found := false
		for i, existing := range deduped {
			if existing.Type == e.Type {
				// Exact match or close match
				if strings.EqualFold(existing.Name, e.Name) || levenshtein.ComputeDistance(strings.ToLower(existing.Name), strings.ToLower(e.Name)) <= 2 {
					// Merge scenes
					sceneMap := make(map[string]bool)
					for _, s := range existing.Scenes {
						sceneMap[s] = true
					}
					for _, s := range e.Scenes {
						if !sceneMap[s] {
							deduped[i].Scenes = append(deduped[i].Scenes, s)
						}
					}
					// Concatenate details
					if e.Details != "" && !strings.Contains(existing.Details, e.Details) {
						if deduped[i].Details != "" {
							deduped[i].Details += "; "
						}
						deduped[i].Details += e.Details
					}
					found = true
					break
				}
			}
		}

		if !found {
			deduped = append(deduped, e)
		}
	}

	return deduped
}

func (o *AIOrchestrator) assignDepartment(entityType string) string {
	switch entityType {
	case "Character", "Stunt":
		return "Cast"
	case "Location":
		return "Locations"
	case "Prop", "Set Decoration":
		return "Art"
	case "Costume", "Wardrobe":
		return "Costume"
	case "Equipment", "Camera", "Lighting", "Sound":
		return "Equipment"
	case "Vehicle":
		return "Transport"
	case "VFX":
		return "VFX"
	default:
		return "Production"
	}
}
