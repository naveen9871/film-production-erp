package handlers

import (
	"os"
	"strings"
	"testing"

	"film-production-erp/services"
)

// TestDemoScriptExtraction guards the screenplay used in the live demo.
// Capitalized character introductions must come out as cast, not props.
func TestDemoScriptExtraction(t *testing.T) {
	raw, err := os.ReadFile("../../demo_script.txt")
	if err != nil {
		t.Skip("demo_script.txt not found")
	}
	els := services.ExtractEntitiesRuleBased(0, services.ParseScript(0, string(raw)))
	got := map[string]string{}
	for _, e := range els {
		got[strings.ToLower(e.Name)] = e.Type
	}
	for _, name := range []string{"priya", "rajan", "judge krishnamurthy", "advocate mehta", "constable raj", "court stenographer"} {
		if got[name] != "Character" {
			t.Errorf("%q = %q, want Character", name, got[name])
		}
	}
	for _, name := range []string{"rajan", "rajan mehta", "officer sharma", "police"} {
		if got[name] == "Prop" {
			t.Errorf("%q was extracted as a prop", name)
		}
	}
	if got["robe"] != "Costume" {
		t.Errorf("BLACK ROBES should be the Robe costume, got %q", got["robe"])
	}
}
