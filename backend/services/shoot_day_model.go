package services

import (
	_ "embed"
	"encoding/json"
	"film-production-erp/models"
	"sync"
)

// ─── Shoot-Day Prediction Model ─────────────────────────────────────────────
//
// This is the core AI/ML contribution: given only script-derived counts (no
// explicit duration is present in a screenplay), how many days will the
// production take to shoot? That number is the base minimum every other
// cost driver (set rental days, equipment rental days, cast day-rates) is
// computed from.
//
// Four model families were fit and compared offline on the 200-film
// benchmark (benchmark_films.csv) using 5-fold cross-validation —
// see scripts/compare_shoot_day_models.py:
//
//   Model               OOF MAE   RMSE     MAPE    R²
//   Gradient Boosting   11.50d   15.97d   18.4%    0.894
//   Random Forest       11.70d   16.49d   18.8%    0.887   <- deployed
//   Linear Regression   12.43d   17.07d   21.3%    0.878
//   Decision Tree       13.78d   17.82d   22.0%    0.867
//   Naive category-mean 14.96d      —     24.5%    0.840   (baseline)
//
// The forest embedded below was fit on the original 100 films, which is
// where Random Forest won outright (MAE 5.20, R² 0.980). On the 200-film
// set Gradient Boosting is 0.2 days ahead. The service keeps this forest:
// the margin is small, and the holdout protocol (selection on 160 films)
// still picks Random Forest. See scripts/export_shoot_day_forest.py.
//
// Known limitations (worth stating honestly rather than hiding):
//   - Final generalization is a stratified 40-film holdout plus a tier-shift
//     test, from scripts/heldout_generalization.py. Entity counts are
//     researcher-estimated, so that test stays inside this dataset.
//   - Ensemble tree predictions are less directly interpretable than a
//     linear model's coefficients — for producer-facing "why this number"
//     explanations, see the scene-level heuristic breakdown layer, which is
//     intentionally simple/interpretable rather than the most accurate.
//   - On 200 films the forest's in-sample MAE is 8.62 days against an
//     out-of-fold MAE of 11.70. Linear Regression's gap is smaller
//     (11.69 vs 12.43).

//go:embed shoot_day_forest.json
var shootDayForestJSON []byte

type forestNode struct {
	Leaf      bool        `json:"leaf"`
	Value     float64     `json:"value,omitempty"`
	Feature   int         `json:"feature,omitempty"`
	Threshold float64     `json:"threshold,omitempty"`
	Left      *forestNode `json:"left,omitempty"`
	Right     *forestNode `json:"right,omitempty"`
}

type forestModel struct {
	Features []string      `json:"features"`
	Trees    []*forestNode `json:"trees"`
}

var (
	forestOnce   sync.Once
	loadedForest *forestModel
)

func getForest() *forestModel {
	forestOnce.Do(func() {
		var f forestModel
		if err := json.Unmarshal(shootDayForestJSON, &f); err == nil {
			loadedForest = &f
		} else {
			loadedForest = &forestModel{} // empty forest -> predictions fall back to floor below
		}
	})
	return loadedForest
}

func predictTree(node *forestNode, x []float64) float64 {
	for !node.Leaf {
		if x[node.Feature] <= node.Threshold {
			node = node.Left
		} else {
			node = node.Right
		}
	}
	return node.Value
}

// PredictShootDays estimates total production shoot days from script-derived
// entity counts using the deployed Random Forest (see model comparison
// above). Floored at 1 day.
func PredictShootDays(numCharacters, numLocations, numProps, numCostumes, numEquipment int) float64 {
	x := []float64{
		float64(numCharacters), float64(numLocations), float64(numProps),
		float64(numCostumes), float64(numEquipment),
	}

	forest := getForest()
	if len(forest.Trees) == 0 {
		return 1 // forest failed to load; caller should treat this as "unavailable"
	}

	var sum float64
	for _, tree := range forest.Trees {
		sum += predictTree(tree, x)
	}
	pred := sum / float64(len(forest.Trees))

	if pred < 1 {
		pred = 1
	}
	return round2(pred)
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}

// CountElementsByType tallies extracted entities by type — the feature
// vector PredictShootDays expects.
func CountElementsByType(elements []models.ProductionElement) (characters, locations, props, costumes, equipment int) {
	for _, el := range elements {
		switch el.Type {
		case "Character":
			characters++
		case "Location":
			locations++
		case "Prop":
			props++
		case "Costume":
			costumes++
		case "Equipment":
			equipment++
		}
	}
	return
}
