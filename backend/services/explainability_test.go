package services

import (
	"math"
	"testing"

	"film-production-erp/models"
)

func TestExplainabilityCountsRecurringCharacters(t *testing.T) {
	scenes := []models.Scene{
		{ID: 1, SceneNumber: "1", Heading: "INT. OFFICE - DAY", Content: "PRIYA\nWhere were you?\n\nRAJAN\nHome.", PageLength: 0.5},
		{ID: 2, SceneNumber: "2", Heading: "EXT. BEACH - NIGHT", Content: "PRIYA walks along the seafront.", PageLength: 0.5},
		{ID: 3, SceneNumber: "3", Heading: "INT. COURT - DAY", Content: "JUDGE  KRISHNAMURTHY sits. RAJAN waits.", PageLength: 0.5},
	}
	elements := []models.ProductionElement{
		{SceneID: 1, Type: "Character", Name: "PRIYA"},
		{SceneID: 1, Type: "Character", Name: "RAJAN"},
		{SceneID: 3, Type: "Character", Name: "JUDGE KRISHNAMURTHY"},
	}

	res := AnalyzeScriptExplainability(1, scenes, elements, 10)

	want := map[string]int{"1": 2, "2": 1, "3": 2}
	for _, sc := range res.Scenes {
		if sc.CharacterCount != want[sc.SceneNumber] {
			t.Errorf("scene %s: got %d characters %v, want %d", sc.SceneNumber, sc.CharacterCount, sc.Characters, want[sc.SceneNumber])
		}
	}

	var sum float64
	for _, sc := range res.Scenes {
		sum += sc.ReconciledDays
	}
	if math.Abs(sum-10) > 0.05*float64(len(res.Scenes)) {
		t.Errorf("reconciled days sum to %.2f, want 10 within rounding", sum)
	}

	if res.HighestComplexity == nil || res.HighestComplexity.ReconciledDays == 0 {
		t.Errorf("highest-complexity scene should carry its reconciled days, got %+v", res.HighestComplexity)
	}
}

func TestEntityShootDaysFollowScenes(t *testing.T) {
	scenes := []models.Scene{
		{ID: 1, Location: "OFFICE", Content: "PRIYA\nWhere?", PageLength: 0.5},
		{ID: 2, Location: "BEACH", Content: "PRIYA walks.", PageLength: 0.5},
		{ID: 3, Location: "OFFICE", Content: "A GUARD waits.", PageLength: 0.5},
		{ID: 4, Location: "COURT", Content: "Silence.", PageLength: 0.5},
	}
	elements := []models.ProductionElement{
		{SceneID: 1, Type: "Character", Name: "PRIYA"},
		{SceneID: 3, Type: "Character", Name: "GUARD"},
		{SceneID: 1, Type: "Location", Name: "OFFICE"},
	}

	days := EntityShootDays(scenes, elements, 40)
	if days == nil {
		t.Fatal("expected per-entity days")
	}
	// Equal scenes share 40 days evenly: PRIYA and OFFICE span two scenes, GUARD one.
	want := []float64{20, 10, 20}
	for i := range want {
		if days[i] != want[i] {
			t.Errorf("%s: got %.1f days, want %.1f", elements[i].Name, days[i], want[i])
		}
	}
	if g := CastGrade(days[0], 40); g != "Lead" {
		t.Errorf("PRIYA grade = %s, want Lead", g)
	}
	if g := CastGrade(days[1], 40); g != "Supporting" {
		t.Errorf("GUARD grade = %s, want Supporting", g)
	}
	lead := elements[0]
	lead.SubCategory, lead.EstimatedDays = "Lead", days[0]
	if unit, qty := BillingUnit(lead); unit != "per_film" || qty != 1 {
		t.Errorf("lead billing = %s x %.1f, want per_film x 1", unit, qty)
	}
	loc := elements[2]
	loc.EstimatedDays = days[2]
	if unit, qty := BillingUnit(loc); unit != "per_day" || qty != 20 {
		t.Errorf("location billing = %s x %.1f, want per_day x 20", unit, qty)
	}

	if EntityShootDays(scenes, elements, 0) != nil {
		t.Error("no prediction should leave extractor days untouched")
	}
}
