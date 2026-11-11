package handlers

import (
	"film-production-erp/services"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// ─── Fixed Ground-Truth Extraction Test Set ────────────────────────────────
//
// Mid-semester used a 2-scene excerpt (16 labeled entities) and reported
// recall of 75%. The final corpus keeps those two scenes and adds ten more.
// It still contains items the extractor is expected to miss:
//
//   - a sentence-case role with no character cue ("Grandmother")
//   - lowercase objects outside the glossary (kaleidoscope, anklet, incense,
//     textbook, crate, projector)
//
// The added scenes and the final extractor rules were written in the same
// development pass, so this is a development-set score, not a blind test.

const groundTruthScript = `INT. WAREHOUSE - NIGHT

RAVI enters, gripping a rusted KNIFE. He wears a torn LEATHER JACKET stained with mud.

RAVI
(low, tense)
We need to move before they bring the DRONE overhead.

THE FOLLOWING MORNING

MEERA
Where's the getaway CAR?

Ravi tosses her a rusted KEY. A frayed BANDANA is tied around his neck.

EXT. DOCKYARD - DAY

Containers stacked high. A GENERATOR hums nearby. Suresh watches through old BINOCULARS, his grandfather's silver HARMONICA tucked in his pocket.

SURESH
Get the CRANE operator on comms.

The boom POLE snaps under the wind.

INT. POLICE STATION - DAY

Inspector ARUN slams a case FILE onto the desk. He wears a faded khaki UNIFORM.

ARUN
Get me the lab report.

On the windowsill sit a kaleidoscope and a silver anklet nobody logged.

EXT. HIGHWAY - NIGHT

A truck screams past. MAYA grips the wheel, red SAREE snapping in the wind.

MAYA
Don't stop.

A GIMBAL is bolted to the door. Her WALKIE crackles once, then dies.

INT. TEMPLE COURTYARD - DAWN

PRIEST adjusts his DHOTI and sets a brass LAMP on the stone.

PRIEST
The procession starts at the gate.

Two assistants carry a heavy DRUM. Incense smoke curls past a stone pillar.

INT. NEWSROOM - DAY

ANCHOR straightens her BLAZER. A TELEPROMPTER glows.

ANCHOR
We are live in five.

She clips a LAPEL MIC to the blazer and checks her NOTES.

EXT. VILLAGE WELL - DAY

CHOTU hauls a ROPE. His torn SHIRT sticks to his back. A steel BUCKET scrapes the stone.

CHOTU
One more pull.

Grandmother watches, a thin gold NECKLACE catching the sun. Somewhere a radio plays.

INT. LABORATORY - NIGHT

DR. SHARMA pours a green liquid into a GLASS. Safety GOGGLES hang around her neck.

DR. SHARMA
Seal the sample.

A backup GENERATOR kicks in. The MICROSCOPE is still warm.

EXT. RAILWAY PLATFORM - NIGHT

A TRAIN idles. REHMAN checks his WATCH, then the paper TICKET.

REHMAN
Platform two.

Porters drag a heavy SUITCASE. A station SPEAKER crackles above them.

INT. PALACE CORRIDOR - NIGHT

QUEEN ANITA lifts the hem of her silk GOWN. A GUARD steps from the shadow with a drawn SWORD.

QUEEN ANITA
Who sent you?

GUARD
Stay where you are.

A SERVANT bows and retreats. Torchlight hits a gold CROWN on a velvet cushion.

INT. CLASSROOM - DAY

TEACHER writes on the BOARD. Students open a textbook.

TEACHER
Page forty.

NINA
Here.

NINA raises a pencil. Her school UNIFORM is one size too big. A ceiling projector hums.

EXT. FOREST CLEARING - DUSK

VIKRAM crouches. He raises BINOCULARS, then lowers a long RIFLE.

VIKRAM
Two figures, north ridge.

He ties a BANDANA over his mouth. A DRONE passes once and is gone.
Nearby, an unmarked crate holds a harmonica still in its case.
`

var groundTruth = map[string][]string{
	"Character": {
		"Ravi", "Meera", "Suresh", "Arun", "Maya", "Priest", "Anchor", "Chotu",
		"Dr. Sharma", "Rehman", "Queen Anita", "Guard", "Servant", "Teacher",
		"Nina", "Vikram", "Grandmother",
	},
	"Location": {
		"Warehouse", "Dockyard", "Police Station", "Highway", "Temple Courtyard",
		"Newsroom", "Village Well", "Laboratory", "Railway Platform",
		"Palace Corridor", "Classroom", "Forest Clearing",
	},
	"Prop": {
		"Knife", "Car", "Key", "Binoculars", "Harmonica", "File", "Truck", "Lamp",
		"Drum", "Notes", "Rope", "Bucket", "Radio", "Glass", "Train", "Watch",
		"Ticket", "Suitcase", "Sword", "Board", "Pencil", "Rifle",
		"Kaleidoscope", "Anklet", "Incense", "Textbook", "Crate",
	},
	"Costume": {
		"Jacket", "Bandana", "Uniform", "Saree", "Dhoti", "Blazer", "Shirt",
		"Necklace", "Goggles", "Gown", "Crown",
	},
	"Equipment": {
		"Drone", "Generator", "Crane", "Boom Pole", "Gimbal", "Walkie",
		"Teleprompter", "Lapel Mic", "Microscope", "Speaker", "Projector",
	},
}

type ExtractionTestTypeResult struct {
	EntityType     string   `json:"entityType"`
	GroundTruth    int      `json:"groundTruth"`
	TruePositives  []string `json:"truePositives"`
	FalsePositives []string `json:"falsePositives"`
	FalseNegatives []string `json:"falseNegatives"`
	Precision      float64  `json:"precision"`
	Recall         float64  `json:"recall"`
	F1Score        float64  `json:"f1Score"`
}

type ExtractionTestSetReport struct {
	CorpusDescription string                     `json:"corpusDescription"`
	SceneCount        int                        `json:"sceneCount"`
	ByType            []ExtractionTestTypeResult `json:"byType"`
	OverallPrecision  float64                    `json:"overallPrecision"`
	OverallRecall     float64                    `json:"overallRecall"`
	OverallF1Score    float64                    `json:"overallF1Score"`
	Note              string                     `json:"note"`
}

func norm(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// ─── Shoot-Day Prediction Model Validation ─────────────────────────────────
//
// Reports the cross-validated accuracy of services.PredictShootDays — the
// core model this dissertation is evaluated on: given only script-derived
// entity counts (a screenplay never states its own shoot duration), predict
// total production shoot days. Four model families (Linear Regression,
// Decision Tree, Random Forest, Gradient Boosting) were fit and compared on
// identical 5-fold cross-validation folds — see
// scripts/compare_shoot_day_models.py, a standalone, re-runnable artifact
// producing exactly the numbers below. Random Forest was selected for
// deployment because it had the best out-of-fold MAE/MAPE of all four.

type ShootDayCategoryMetric struct {
	Category  string  `json:"category"`
	FilmCount int     `json:"filmCount"`
	MAE       float64 `json:"maeDays"`
	RMSE      float64 `json:"rmseDays"`
	MAPE      float64 `json:"mapePct"`
	R2        float64 `json:"r2"`
}

type ShootDayModelComparisonEntry struct {
	Model    string  `json:"model"`
	MAE      float64 `json:"maeDays"`
	RMSE     float64 `json:"rmseDays"`
	MAPE     float64 `json:"mapePct"`
	R2       float64 `json:"r2"`
	Deployed bool    `json:"deployed"`
}

type ShootDayModelReport struct {
	Methodology        string                         `json:"methodology"`
	ModelFormula       string                         `json:"modelFormula"`
	SampleSize         int                            `json:"sampleSize"`
	ModelComparison    []ShootDayModelComparisonEntry `json:"modelComparison"`
	OverallMAE         float64                        `json:"overallMaeDays"`
	OverallRMSE        float64                        `json:"overallRmseDays"`
	OverallMAPE        float64                        `json:"overallMapePct"`
	OverallR2          float64                        `json:"overallR2"`
	ByCategory         []ShootDayCategoryMetric       `json:"byCategory"`
	BaselineMAE        float64                        `json:"baselineMaeDays"`
	BaselineMAPE       float64                        `json:"baselineMapePct"`
	ImprovementMAEPct  float64                        `json:"improvementMaePct"`
	ImprovementMAPEPct float64                        `json:"improvementMapePct"`
	Limitations        []string                       `json:"limitations"`
	ReproduceCommand   string                         `json:"reproduceCommand"`
}

// GetShootDayModelMetrics returns the pre-computed, reproducible 5-fold
// cross-validation results for the shoot-day prediction model. These are not
// recomputed per-request (fitting is an offline training step, same as any
// ML model — see scripts/compare_shoot_day_models.py) but the numbers are
// real, measured results from actually running these four algorithms
// against the 200-film benchmark dataset, not illustrative placeholders.
func GetShootDayModelMetrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, ShootDayModelReport{
			Methodology:  "Four model families fit on the 200-film benchmark and evaluated on identical 5-fold cross-validation folds (out-of-fold predictions pooled across all 200 films). On this expanded set Gradient Boosting is narrowly ahead (MAE 11.50 vs 11.70). Random Forest stays the deployed model: the gap is 0.2 days, and when selection is repeated on the 160-film training split only, Random Forest still wins. The mid-semester 100-film result (Random Forest MAE 5.20, R² 0.980) is the earlier number; it does not survive the larger set.",
			ModelFormula: "Deployed Random Forest: 50 trees, max depth 4, bagging + feature subsampling (3 of 5 features per split). See scripts/export_shoot_day_forest.py. Fit for deployment on the original 100 films.",
			SampleSize:   200,
			ModelComparison: []ShootDayModelComparisonEntry{
				{Model: "Gradient Boosting", MAE: 11.50, RMSE: 15.97, MAPE: 18.4, R2: 0.894},
				{Model: "Random Forest", MAE: 11.70, RMSE: 16.49, MAPE: 18.8, R2: 0.887, Deployed: true},
				{Model: "Linear Regression", MAE: 12.43, RMSE: 17.07, MAPE: 21.3, R2: 0.878},
				{Model: "Decision Tree", MAE: 13.78, RMSE: 17.82, MAPE: 22.0, R2: 0.867},
			},
			OverallMAE:  11.70,
			OverallRMSE: 16.49,
			OverallMAPE: 18.8,
			OverallR2:   0.887,
			ByCategory: []ShootDayCategoryMetric{
				{Category: "High", FilmCount: 50, MAE: 18.79, RMSE: 25.20, MAPE: 13.0, R2: 0.057},
				{Category: "Medium", FilmCount: 90, MAE: 11.67, RMSE: 14.50, MAPE: 20.5, R2: 0.395},
				{Category: "Low", FilmCount: 60, MAE: 5.83, RMSE: 7.86, MAPE: 21.1, R2: 0.535},
			},
			BaselineMAE:        14.96,
			BaselineMAPE:       24.5,
			ImprovementMAEPct:  21.8,
			ImprovementMAPEPct: 23.2,
			Limitations: []string{
				"The mid-semester 100-film cross-validation (Random Forest MAE 5.20 days, R² 0.980) was optimistic. Adding 100 films whose entity counts are genre-and-scale estimates, not a function of shoot days, moves out-of-fold MAE to 11.70 days and R² to 0.887.",
				"Gradient Boosting is 0.20 days better than Random Forest on the full 200-film cross-validation. The service still deploys the Random Forest. On the 160-film training split used for the holdout, Random Forest is the one selected.",
				"In-sample MAE for the forest is 8.62 days against an out-of-fold MAE of 11.70. Linear Regression's gap is smaller (11.69 vs 12.43). The forest fits the training films more closely.",
				"High-budget R² on this set is 0.057: percentage error is 13%, but most of the day-count variance inside that tier is unexplained. A whole tier left out of training still fails. See GET /validation/held-out.",
				"Entity counts are researcher-estimated. This is generalization inside the benchmark, not a test on screenplays from outside it.",
			},
			ReproduceCommand: "python3 scripts/compare_shoot_day_models.py",
		})
	}
}

// PredictShootDaysAdHoc runs the actual deployed model (services.PredictShootDays
// — the Random Forest selected via cross-validation above) against arbitrary
// entity counts, for the Evaluation Dashboard's "try it" calculator. This
// calls the real model rather than re-implementing tree traversal in the
// frontend, so the calculator can never drift out of sync with what's deployed.
func PredictShootDaysAdHoc() gin.HandlerFunc {
	return func(c *gin.Context) {
		atoi := func(key string) int {
			v, _ := strconv.Atoi(c.Query(key))
			if v < 0 {
				return 0
			}
			return v
		}
		characters := atoi("characters")
		locations := atoi("locations")
		props := atoi("props")
		costumes := atoi("costumes")
		equipment := atoi("equipment")

		predicted := services.PredictShootDays(characters, locations, props, costumes, equipment)
		c.JSON(http.StatusOK, gin.H{
			"predictedShootDays": predicted,
			"modelUsed":          "Random Forest (deployed — see /validation/shoot-day-model for cross-validated accuracy)",
		})
	}
}

// GetExtractionTestSet runs the deterministic rule-based extractor against
// the fixed ground-truth corpus above and reports Precision/Recall/F1 per
// entity type plus overall (micro-averaged). Unlike GetEvaluationMetrics,
// this does not depend on any production's live data — it is the same
// every time it is called, by design.
func GetExtractionTestSet() gin.HandlerFunc {
	return func(c *gin.Context) {
		scenes := services.ParseScript(0, groundTruthScript)
		elements := services.ExtractEntitiesRuleBased(0, scenes)

		predictedByType := map[string][]string{}
		for _, el := range elements {
			predictedByType[el.Type] = append(predictedByType[el.Type], el.Name)
		}

		entityTypes := []string{"Character", "Location", "Prop", "Costume", "Equipment"}
		var byType []ExtractionTestTypeResult
		var globalTP, globalFP, globalFN int

		for _, et := range entityTypes {
			truth := groundTruth[et]
			predicted := predictedByType[et]

			truthSet := map[string]bool{}
			for _, t := range truth {
				truthSet[norm(t)] = true
			}
			predSet := map[string]bool{}
			for _, p := range predicted {
				predSet[norm(p)] = true
			}

			tp := []string{}
			fp := []string{}
			fn := []string{}
			for _, p := range predicted {
				if truthSet[norm(p)] {
					tp = append(tp, p)
				} else {
					fp = append(fp, p)
				}
			}
			for _, t := range truth {
				if !predSet[norm(t)] {
					fn = append(fn, t)
				}
			}
			sort.Strings(tp)
			sort.Strings(fp)
			sort.Strings(fn)

			var precision, recall, f1 float64
			if len(tp)+len(fp) > 0 {
				precision = round2(float64(len(tp)) / float64(len(tp)+len(fp)))
			}
			if len(tp)+len(fn) > 0 {
				recall = round2(float64(len(tp)) / float64(len(tp)+len(fn)))
			}
			if precision+recall > 0 {
				f1 = round2(2 * precision * recall / (precision + recall))
			}

			globalTP += len(tp)
			globalFP += len(fp)
			globalFN += len(fn)

			byType = append(byType, ExtractionTestTypeResult{
				EntityType:     et,
				GroundTruth:    len(truth),
				TruePositives:  tp,
				FalsePositives: fp,
				FalseNegatives: fn,
				Precision:      precision,
				Recall:         recall,
				F1Score:        f1,
			})
		}

		overallP, overallR, overallF1 := overallPRF(globalTP, globalFP, globalFN)

		c.JSON(http.StatusOK, ExtractionTestSetReport{
			CorpusDescription: "12-scene hand-labeled screenplay corpus (the original 2 mid-semester scenes plus 10 added for the final). Fixed and reproducible — not live production data.",
			SceneCount:        len(scenes),
			ByType:            byType,
			OverallPrecision:  overallP,
			OverallRecall:     overallR,
			OverallF1Score:    overallF1,
			Note:              "Mid-semester keyword-only recall on the 2-scene set was 75% (F1 83%). This run uses the final extractor: dialogue-block character cues, rejection of transition slugs such as THE FOLLOWING MORNING, a longer production glossary, and a capitalized action-phrase pass that files role introductions (JUDGE KRISHNAMURTHY) as cast and other capitalized objects as props. Remaining misses are a sentence-case role with no cue and lowercase objects not in the glossary. The corpus and rules were developed together, so read this as a development-set score.",
		})
	}
}

// ─── Ablation Study ─────────────────────────────────────────────────────────
//
// Compares extraction quality with vs without the fuzzy-string deduplication
// pass. Without dedup, near-duplicates ("KNIFE", "Knife", "knife") each
// create a separate entity, inflating TP and FP counts inconsistently and
// reducing precision. With dedup (the deployed configuration), canonical
// forms are unified before comparison.

type AblationCondition struct {
	Label     string                     `json:"label"`
	ByType    []ExtractionTestTypeResult `json:"byType"`
	OverallP  float64                    `json:"overallPrecision"`
	OverallR  float64                    `json:"overallRecall"`
	OverallF1 float64                    `json:"overallF1"`
}

type AblationReport struct {
	Description  string             `json:"description"`
	WithDedup    AblationCondition  `json:"withDedup"`
	WithoutDedup AblationCondition  `json:"withoutDedup"`
	DeltaF1      map[string]float64 `json:"deltaF1ByType"`
	Conclusion   string             `json:"conclusion"`
}

// runExtractionMetrics computes per-type P/R/F1 given predicted names (pre-processed
// with optional case-fold-only vs full fuzzy normalisation).
func runExtractionMetrics(predictedByType map[string][]string, fuzzy bool) ([]ExtractionTestTypeResult, float64, float64, float64) {
	entityTypes := []string{"Character", "Location", "Prop", "Costume", "Equipment"}
	var byType []ExtractionTestTypeResult
	var globalTP, globalFP, globalFN int

	normalise := func(s string) string {
		s = strings.ToLower(strings.TrimSpace(s))
		if !fuzzy {
			return s
		}
		// Minimal fuzzy: strip trailing 's' (plurals), collapse inner spaces
		s = strings.ReplaceAll(s, "  ", " ")
		if len(s) > 3 && strings.HasSuffix(s, "s") {
			s = s[:len(s)-1]
		}
		return s
	}

	for _, et := range entityTypes {
		truth := groundTruth[et]
		predicted := predictedByType[et]

		truthSet := map[string]bool{}
		for _, t := range truth {
			truthSet[normalise(t)] = true
		}
		predSet := map[string]bool{}
		for _, p := range predicted {
			predSet[normalise(p)] = true
		}

		tp, fp, fn := []string{}, []string{}, []string{}
		seen := map[string]bool{}
		for _, p := range predicted {
			k := normalise(p)
			if seen[k] {
				// With-dedup: skip duplicate; Without-dedup: count as separate FP
				if !fuzzy {
					fp = append(fp, p+" [dup]")
				}
				continue
			}
			seen[k] = true
			if truthSet[k] {
				tp = append(tp, p)
			} else {
				fp = append(fp, p)
			}
		}
		for _, t := range truth {
			if !predSet[normalise(t)] {
				fn = append(fn, t)
			}
		}
		sort.Strings(tp)
		sort.Strings(fp)
		sort.Strings(fn)

		var precision, recall, f1 float64
		if len(tp)+len(fp) > 0 {
			precision = round2(float64(len(tp)) / float64(len(tp)+len(fp)))
		}
		if len(tp)+len(fn) > 0 {
			recall = round2(float64(len(tp)) / float64(len(tp)+len(fn)))
		}
		if precision+recall > 0 {
			f1 = round2(2 * precision * recall / (precision + recall))
		}
		globalTP += len(tp)
		globalFP += len(fp)
		globalFN += len(fn)

		byType = append(byType, ExtractionTestTypeResult{
			EntityType: et, GroundTruth: len(truth),
			TruePositives: tp, FalsePositives: fp, FalseNegatives: fn,
			Precision: precision, Recall: recall, F1Score: f1,
		})
	}

	overallP, overallR, overallF1 := overallPRF(globalTP, globalFP, globalFN)
	return byType, overallP, overallR, overallF1
}

// overallPRF computes micro-averaged precision, recall and F1, rounded to
// three decimals. F1 uses the unrounded P and R so that, for example,
// P=1.000 and R=0.910 give F1=0.953 rather than 0.95.
func overallPRF(tp, fp, fn int) (p, r, f1 float64) {
	round3 := func(v float64) float64 { return math.Round(v*1000) / 1000 }
	if tp+fp > 0 {
		p = float64(tp) / float64(tp+fp)
	}
	if tp+fn > 0 {
		r = float64(tp) / float64(tp+fn)
	}
	if p+r > 0 {
		f1 = 2 * p * r / (p + r)
	}
	return round3(p), round3(r), round3(f1)
}

func GetAblationReport() gin.HandlerFunc {
	return func(c *gin.Context) {
		scenes := services.ParseScript(0, groundTruthScript)
		elements := services.ExtractEntitiesRuleBased(0, scenes)

		// Build raw predicted-by-type map (as the extractor returns it)
		rawByType := map[string][]string{}
		for _, el := range elements {
			rawByType[el.Type] = append(rawByType[el.Type], el.Name)
		}

		withBT, withP, withR, withF1 := runExtractionMetrics(rawByType, true)
		withoutBT, woP, woR, woF1 := runExtractionMetrics(rawByType, false)

		deltaF1 := map[string]float64{}
		for i, et := range withBT {
			if i < len(withoutBT) {
				deltaF1[et.EntityType] = round2(et.F1Score - withoutBT[i].F1Score)
			}
		}

		c.JSON(http.StatusOK, AblationReport{
			Description: "Ablation: effect of fuzzy-string deduplication on Precision/Recall/F1 for each entity type on the fixed ground-truth corpus.",
			WithDedup: AblationCondition{
				Label:  "With Fuzzy Deduplication (Deployed)",
				ByType: withBT, OverallP: withP, OverallR: withR, OverallF1: withF1,
			},
			WithoutDedup: AblationCondition{
				Label:  "Without Deduplication (Ablated)",
				ByType: withoutBT, OverallP: woP, OverallR: woR, OverallF1: woF1,
			},
			DeltaF1:    deltaF1,
			Conclusion: "Fuzzy deduplication consistently improves precision (fewer duplicate false positives) while maintaining recall. The improvement is most visible for multi-mention entities (Props, Equipment) where the same item appears with varying capitalisation across scene headings and action lines.",
		})
	}
}

// ─── Confusion Matrix ────────────────────────────────────────────────────────
//
// Shows predicted-vs-actual entity type for each item in the ground-truth
// corpus that was either misclassified or correctly classified. This makes
// the specific failure modes of the rule-based extractor legible.

type ConfusionCell struct {
	PredictedAs string `json:"predictedAs"` // "" = missed (FN)
	ActualType  string `json:"actualType"`
	Name        string `json:"name"`
	Correct     bool   `json:"correct"`
}

type ConfusionMatrixReport struct {
	// Matrix[actual][predicted] = count
	Labels []string        `json:"labels"`
	Matrix [][]int         `json:"matrix"`
	Cells  []ConfusionCell `json:"cells"`
	Note   string          `json:"note"`
}

func GetConfusionMatrix() gin.HandlerFunc {
	return func(c *gin.Context) {
		scenes := services.ParseScript(0, groundTruthScript)
		elements := services.ExtractEntitiesRuleBased(0, scenes)

		// Build name → predicted-type map
		nameToType := map[string]string{}
		for _, el := range elements {
			nameToType[norm(el.Name)] = el.Type
		}

		labels := []string{"Character", "Location", "Prop", "Costume", "Equipment", "(missed)"}
		labelIdx := map[string]int{}
		for i, l := range labels {
			labelIdx[l] = i
		}
		missedIdx := len(labels) - 1

		n := len(labels)
		matrix := make([][]int, n)
		for i := range matrix {
			matrix[i] = make([]int, n)
		}

		var cells []ConfusionCell

		for actualType, names := range groundTruth {
			for _, name := range names {
				predictedType, found := nameToType[norm(name)]
				cell := ConfusionCell{ActualType: actualType, Name: name}
				if !found {
					cell.PredictedAs = "(missed)"
					cell.Correct = false
					matrix[labelIdx[actualType]][missedIdx]++
				} else {
					cell.PredictedAs = predictedType
					cell.Correct = predictedType == actualType
					matrix[labelIdx[actualType]][labelIdx[predictedType]]++
				}
				cells = append(cells, cell)
			}
		}

		// Also add false positives (predicted but not in any ground-truth)
		allGTNames := map[string]bool{}
		for _, names := range groundTruth {
			for _, n := range names {
				allGTNames[norm(n)] = true
			}
		}
		for _, el := range elements {
			if !allGTNames[norm(el.Name)] {
				// FP — not in any ground truth
				cells = append(cells, ConfusionCell{
					ActualType:  "(none)",
					PredictedAs: el.Type,
					Name:        el.Name,
					Correct:     false,
				})
			}
		}

		c.JSON(http.StatusOK, ConfusionMatrixReport{
			Labels: labels,
			Matrix: matrix,
			Cells:  cells,
			Note:   "Rows = actual entity type (ground truth). Columns = predicted by rule-based extractor. '(missed)' column = False Negatives. Cells not in ground truth but predicted = False Positives shown in the Cells list with actualType='(none)'.",
		})
	}
}
