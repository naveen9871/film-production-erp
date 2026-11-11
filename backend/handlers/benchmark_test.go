package handlers

import (
	"encoding/json"
	"math"
	"testing"
)

// The calibration artifact must use the same 160/40 split as the shoot-day
// holdout and record the result the report states.
func TestCostCalibrationArtifact(t *testing.T) {
	var report struct {
		TrainCount     int    `json:"trainCount"`
		TestCount      int    `json:"testCount"`
		SelectedMethod string `json:"selectedMethod"`
		Factors        []struct {
			Scale  string  `json:"scale"`
			Factor float64 `json:"factor"`
		} `json:"factors"`
		Holdout struct {
			RawMapePct        float64 `json:"rawMapePct"`
			CalibratedMapePct float64 `json:"calibratedMapePct"`
			BaselineMapePct   float64 `json:"baselineMapePct"`
		} `json:"holdout"`
	}
	if err := json.Unmarshal(costCalibrationJSON, &report); err != nil {
		t.Fatal(err)
	}
	if report.TrainCount != 160 || report.TestCount != 40 {
		t.Fatalf("split = %d/%d, want 160/40", report.TrainCount, report.TestCount)
	}
	if report.SelectedMethod != "Per-scale factor" || len(report.Factors) != 3 {
		t.Fatalf("method %q with %d factors", report.SelectedMethod, len(report.Factors))
	}
	h := report.Holdout
	if math.Abs(h.RawMapePct-59.9) > 0.05 || math.Abs(h.CalibratedMapePct-48.1) > 0.05 || math.Abs(h.BaselineMapePct-51.1) > 0.05 {
		t.Errorf("holdout raw/calibrated/baseline = %.1f/%.1f/%.1f, want 59.9/48.1/51.1", h.RawMapePct, h.CalibratedMapePct, h.BaselineMapePct)
	}
}

// The dashboard's cost figures must match those reported from the CSV:
// High 48.2%, Medium 63.6%, Low 63.0%, overall 59.6% (baseline 59.4%).
func TestBenchmarkCostSummaryMatchesReport(t *testing.T) {
	films := parseBenchmarkCSV(benchmarkFilmsCSV)
	if len(films) != 200 {
		t.Fatalf("got %d films, want 200", len(films))
	}
	summaries, overall, baseline := benchmarkCategorySummaries(films)

	want := map[string]float64{"High": 48.2, "Medium": 63.6, "Low": 63.0}
	for _, s := range summaries {
		if w, ok := want[s.Category]; ok && math.Abs(s.AvgMAPE-w) > 0.05 {
			t.Errorf("%s MAPE = %.2f, want %.1f", s.Category, s.AvgMAPE, w)
		}
	}
	if math.Abs(overall-59.6) > 0.05 || math.Abs(baseline-59.4) > 0.05 {
		t.Errorf("overall %.2f / baseline %.2f, want 59.6 / 59.4", overall, baseline)
	}
}
