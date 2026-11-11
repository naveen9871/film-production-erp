package handlers

import (
	"encoding/json"
	"strings"
	"testing"

	"film-production-erp/services"
)

// TestFinalExtractionCorpus locks the final-evaluation claims about the
// extractor: the mid-semester misses on the original two scenes are recovered,
// transition slugs are not characters, and the expanded corpus still has
// misses so recall is not a perfect fit to the answer key.
//
// The corpus and these rules were written together, so this is a
// development-set check, not a blind test.
func TestFinalExtractionCorpus(t *testing.T) {
	scenes := services.ParseScript(0, groundTruthScript)
	if len(scenes) != 12 {
		t.Fatalf("corpus has %d scenes, want 12", len(scenes))
	}
	elements := services.ExtractEntitiesRuleBased(0, scenes)

	byType := map[string]map[string]bool{}
	for _, el := range elements {
		if byType[el.Type] == nil {
			byType[el.Type] = map[string]bool{}
		}
		byType[el.Type][strings.ToLower(el.Name)] = true
	}

	has := func(typ, name string) bool {
		return byType[typ][strings.ToLower(name)]
	}

	recovered := []struct{ typ, name string }{
		{"Prop", "Binoculars"},
		{"Prop", "Harmonica"},
		{"Costume", "Bandana"},
		{"Equipment", "Boom Pole"},
		{"Character", "Dr. Sharma"},
		{"Character", "Queen Anita"},
		{"Character", "Nina"},
		{"Character", "Servant"},
	}
	for _, item := range recovered {
		if !has(item.typ, item.name) {
			t.Errorf("expected to recover %s %q (mid-semester miss or new cue form)", item.typ, item.name)
		}
	}
	if has("Character", "The Following Morning") || has("Character", "THE FOLLOWING MORNING") {
		t.Error("transition slug was extracted as a character")
	}

	// These were labeled as misses on purpose. They must stay misses.
	stillMissed := []struct{ typ, name string }{
		{"Prop", "Kaleidoscope"},
		{"Prop", "Anklet"},
		{"Prop", "Incense"},
		{"Prop", "Textbook"},
		{"Prop", "Crate"},
		{"Equipment", "Projector"},
		{"Character", "Grandmother"},
	}
	for _, item := range stillMissed {
		if has(item.typ, item.name) {
			t.Errorf("%s %q was supposed to remain a miss", item.typ, item.name)
		}
	}
	if has("Prop", "Servant") {
		t.Error("a capitalized role introduction was costed as a prop")
	}

	var tp, fp, fn int
	for typ, truth := range groundTruth {
		pred := byType[typ]
		if pred == nil {
			pred = map[string]bool{}
		}
		seen := map[string]bool{}
		for name := range pred {
			seen[name] = true
			ok := false
			for _, g := range truth {
				if strings.ToLower(g) == name {
					ok = true
					break
				}
			}
			if ok {
				tp++
			} else {
				fp++
				t.Logf("FP %s %s", typ, name)
			}
		}
		for _, g := range truth {
			if !seen[strings.ToLower(g)] {
				fn++
				t.Logf("FN %s %s", typ, g)
			}
		}
	}
	// Names predicted under the wrong type are an FP on that type and an FN
	// on the true type. Both are already counted above.
	recall := float64(tp) / float64(tp+fn)
	precision := float64(tp) / float64(tp+fp)
	t.Logf("precision %.3f recall %.3f  tp=%d fp=%d fn=%d", precision, recall, tp, fp, fn)
	if recall < 0.85 {
		t.Fatalf("recall %.3f is not an improvement a final report can stand on (mid-semester was 0.75)", recall)
	}
	if precision < 0.85 {
		t.Fatalf("precision %.3f dropped too far", precision)
	}
}

func TestHeldOutArtifact(t *testing.T) {
	var report struct {
		TestCount     int    `json:"testCount"`
		TrainCount    int    `json:"trainCount"`
		SelectedModel string `json:"selectedModel"`
		Holdout       struct {
			MaeDays float64 `json:"maeDays"`
			MapePct float64 `json:"mapePct"`
		} `json:"holdout"`
		TierShift []struct {
			TestOn string  `json:"testOn"`
			R2     float64 `json:"r2"`
		} `json:"tierShift"`
	}
	if err := json.Unmarshal(heldoutResultsJSON, &report); err != nil {
		t.Fatal(err)
	}
	if report.TrainCount != 160 || report.TestCount != 40 {
		t.Fatalf("split = %d/%d, want 160/40", report.TrainCount, report.TestCount)
	}
	if report.SelectedModel != "Random Forest" {
		t.Fatalf("selected %s", report.SelectedModel)
	}
	if report.Holdout.MaeDays <= 0 || report.Holdout.MapePct <= 0 {
		t.Fatal("holdout metrics missing")
	}
	neg := 0
	for _, row := range report.TierShift {
		if row.R2 < 0 {
			neg++
		}
	}
	if neg == 0 {
		t.Fatal("tier-shift result should record the tiers where R² goes negative")
	}
}
