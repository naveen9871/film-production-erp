package services

import (
	"math"
	"regexp"
	"strings"

	"film-production-erp/models"
)

// elementInScene reports whether an extracted entity appears in a scene.
// Elements store only their first scene, so names are also matched in text.
func elementInScene(el models.ProductionElement, nameRe *regexp.Regexp, sc models.Scene) bool {
	if el.Type == "Location" {
		return strings.EqualFold(strings.TrimSpace(sc.Location), strings.TrimSpace(el.Name))
	}
	return el.SceneID == sc.ID || (nameRe != nil && nameRe.MatchString(strings.ToUpper(sc.Content)))
}

func elementNameRegex(name string) *regexp.Regexp {
	words := strings.Fields(regexp.QuoteMeta(strings.ToUpper(name)))
	if len(words) == 0 {
		return nil
	}
	return regexp.MustCompile(`\b` + strings.Join(words, `\s+`) + `\b`)
}

// EntityShootDays returns, per element, the reconciled shoot days of the
// scenes it appears in, so entity costs inherit the film-level prediction.
// Returns nil when there is no prediction or no scenes to distribute it over.
func EntityShootDays(scenes []models.Scene, elements []models.ProductionElement, predictedDays float64) []float64 {
	if predictedDays <= 0 || len(scenes) == 0 {
		return nil
	}
	breakdown := AnalyzeScriptExplainability(0, scenes, elements, predictedDays)
	if len(breakdown.Scenes) != len(scenes) {
		return nil
	}

	days := make([]float64, len(elements))
	for i, el := range elements {
		re := elementNameRegex(el.Name)
		var total float64
		for j, sc := range scenes {
			if elementInScene(el, re, sc) {
				total += breakdown.Scenes[j].ReconciledDays
			}
		}
		days[i] = math.Max(1, math.Round(total*2)/2)
	}
	return days
}

// CastGrade maps a character's share of the shoot to a rate-card category.
func CastGrade(characterDays, predictedDays float64) string {
	if predictedDays <= 0 {
		return ""
	}
	share := characterDays / predictedDays
	switch {
	case share >= 0.4:
		return "Lead"
	case share >= 0.15:
		return "Supporting"
	default:
		return "Background"
	}
}
