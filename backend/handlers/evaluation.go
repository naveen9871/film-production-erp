package handlers

import (
	_ "embed"
	"encoding/csv"
	"film-production-erp/models"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

//go:embed benchmark_films.csv
var benchmarkFilmsCSV string

// ─── Response Structs ──────────────────────────────────────────────────────

type ExtractionAccuracyByType struct {
	EntityType   string  `json:"entityType"`
	Total        int     `json:"totalGroundTruth"`
	AIExtracted  int     `json:"aiExtracted"`
	UserVerified int     `json:"userVerified"`
	UserAdded    int     `json:"userAdded"`
	UserRejected int     `json:"userRejected"`
	Precision    float64 `json:"precision"`
	Recall       float64 `json:"recall"`
	F1Score      float64 `json:"f1Score"`
}

type CostEstimationByDept struct {
	Department   string  `json:"department"`
	Estimated    float64 `json:"estimated"`
	Actual       float64 `json:"actual"`
	VariancePct  float64 `json:"variancePct"`
	AbsErrorPct  float64 `json:"absErrorPct"`
	IsOverBudget bool    `json:"isOverBudget"`
}

// ─── Benchmark Film Structs ─────────────────────────────────────────────────
// Sourced from benchmark_films.csv — 200 Indian films (50 High / 90 Medium /
// 60 Low budget) with publicly reported totals and rate-card system
// estimates, used to validate cost-estimation error at scale rather than on
// a handful of anecdotal examples.

type BenchmarkDept struct {
	Department  string  `json:"department"`
	Actual      float64 `json:"actual"`    // Reported (₹ Cr)
	Estimated   float64 `json:"estimated"` // System estimate (₹ Cr)
	VariancePct float64 `json:"variancePct"`
	AbsErrPct   float64 `json:"absErrPct"`
}

type BenchmarkFilm struct {
	FilmID         int             `json:"filmId"`
	Title          string          `json:"title"`
	Year           int             `json:"year"`
	Language       string          `json:"language"`
	Genre          string          `json:"genre"`
	BudgetCategory string          `json:"budgetCategory"` // High / Medium / Low
	ShootDays      int             `json:"shootDays"`
	NumCharacters  int             `json:"numCharacters"`
	NumLocations   int             `json:"numLocations"`
	NumProps       int             `json:"numProps"`
	NumCostumes    int             `json:"numCostumes"`
	NumEquipment   int             `json:"numEquipment"`
	TotalActualCr  float64         `json:"totalActualCr"`
	TotalEstCr     float64         `json:"totalEstCr"`
	MAPE           float64         `json:"mape"`
	BaselineEstCr  float64         `json:"baselineEstCr"` // leave-one-out category-mean predictor
	BaselineMAPE   float64         `json:"baselineMape"`
	Departments    []BenchmarkDept `json:"departments"`
}

type BenchmarkCategorySummary struct {
	Category        string  `json:"category"` // High / Medium / Low
	FilmCount       int     `json:"filmCount"`
	AvgMAPE         float64 `json:"avgMape"`
	StdDevMAPE      float64 `json:"stdDevMape"`
	MinMAPE         float64 `json:"minMape"`
	MaxMAPE         float64 `json:"maxMape"`
	BaselineAvgMAPE float64 `json:"baselineAvgMape"` // naive category-mean predictor
	ImprovementPct  float64 `json:"improvementPct"`  // how much lower system MAPE is vs. baseline
}

type EvaluationReport struct {
	ProductionID    uint   `json:"productionId"`
	ProductionTitle string `json:"productionTitle"`

	// Extraction Accuracy
	ExtractionByType  []ExtractionAccuracyByType `json:"extractionByType"`
	OverallPrecision  float64                    `json:"overallPrecision"`
	OverallRecall     float64                    `json:"overallRecall"`
	OverallF1Score    float64                    `json:"overallF1Score"`
	TotalAIExtracted  int                        `json:"totalAiExtracted"`
	TotalUserVerified int                        `json:"totalUserVerified"`
	TotalUserAdded    int                        `json:"totalUserAdded"`
	TotalUserRejected int                        `json:"totalUserRejected"`

	// Live Cost Estimation Error
	CostByDepartment []CostEstimationByDept `json:"costByDepartment"`
	OverallMAPE      float64                `json:"overallMape"`
	TotalEstimated   float64                `json:"totalEstimated"`
	TotalActual      float64                `json:"totalActual"`
	TotalVariancePct float64                `json:"totalVariancePct"`
	HasActualData    bool                   `json:"hasActualData"`

	// Benchmark Film Comparison (200-film dataset)
	BenchmarkFilms               []BenchmarkFilm            `json:"benchmarkFilms"`
	BenchmarkByCategory          []BenchmarkCategorySummary `json:"benchmarkByCategory"`
	BenchmarkOverallMAPE         float64                    `json:"benchmarkOverallMape"`
	BenchmarkBaselineOverallMAPE float64                    `json:"benchmarkBaselineOverallMape"`
	BenchmarkFilmCount           int                        `json:"benchmarkFilmCount"`
}

func round2(val float64) float64 {
	return math.Round(val*100) / 100
}

var (
	benchmarkOnce  sync.Once
	benchmarkCache []BenchmarkFilm
)

// benchmarkFilms parses the embedded 200-film benchmark dataset
// (benchmark_films.csv — 50 High / 90 Medium / 60 Low budget Indian films)
// once and caches the result. Actual figures are publicly reported budgets;
// estimated figures are what our rate-card system computes for a production
// of equivalent scale and entity count, giving a cost-estimation-error
// baseline across a realistic spread of production sizes rather than a
// handful of anecdotal examples.
func benchmarkFilms() []BenchmarkFilm {
	benchmarkOnce.Do(func() {
		benchmarkCache = parseBenchmarkCSV(benchmarkFilmsCSV)
	})
	return benchmarkCache
}

func parseBenchmarkCSV(raw string) []BenchmarkFilm {
	r := csv.NewReader(strings.NewReader(raw))
	header, err := r.Read()
	if err != nil {
		return nil
	}
	col := make(map[string]int, len(header))
	for i, h := range header {
		col[h] = i
	}

	atoi := func(rec []string, name string) int {
		v, _ := strconv.Atoi(rec[col[name]])
		return v
	}
	atof := func(rec []string, name string) float64 {
		v, _ := strconv.ParseFloat(rec[col[name]], 64)
		return v
	}

	var films []BenchmarkFilm
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}

		deptDefs := []struct {
			name      string
			actualCol string
			estCol    string
		}{
			{"Cast (ATL)", "actual_cast_atl_cr", "system_est_cast_cr"},
			{"VFX & Post", "actual_vfx_cr", "system_est_vfx_cr"},
			{"Sets & Locations", "actual_locations_sets_cr", "system_est_locations_cr"},
			{"Equipment", "actual_equipment_cr", "system_est_equipment_cr"},
			{"Art Department", "actual_art_dept_cr", "system_est_art_dept_cr"},
		}

		var depts []BenchmarkDept
		var mapeSum float64
		var mapeCount int
		for _, dd := range deptDefs {
			actual := atof(rec, dd.actualCol)
			est := atof(rec, dd.estCol)
			d := BenchmarkDept{Department: dd.name, Actual: actual, Estimated: est}
			if actual > 0 {
				d.VariancePct = round2((est - actual) / actual * 100)
				d.AbsErrPct = round2(math.Abs(est-actual) / actual * 100)
				mapeSum += d.AbsErrPct
				mapeCount++
			}
			depts = append(depts, d)
		}

		// A film estimated exactly right has a recorded MAPE of 0, so only a
		// missing value falls back to the department average.
		var mape float64
		if i, ok := col["dept_mape_pct"]; ok && i < len(rec) && strings.TrimSpace(rec[i]) != "" {
			mape = atof(rec, "dept_mape_pct")
		} else if mapeCount > 0 {
			mape = round2(mapeSum / float64(mapeCount))
		}

		films = append(films, BenchmarkFilm{
			FilmID:         atoi(rec, "film_id"),
			Title:          rec[col["title"]],
			Year:           atoi(rec, "year"),
			Language:       rec[col["language"]],
			Genre:          rec[col["genre"]],
			BudgetCategory: rec[col["budget_category"]],
			ShootDays:      atoi(rec, "total_shoot_days"),
			NumCharacters:  atoi(rec, "num_characters"),
			NumLocations:   atoi(rec, "num_locations"),
			NumProps:       atoi(rec, "num_props"),
			NumCostumes:    atoi(rec, "num_costumes"),
			NumEquipment:   atoi(rec, "num_equipment"),
			TotalActualCr:  atof(rec, "actual_total_cr"),
			TotalEstCr:     atof(rec, "system_est_total_cr"),
			MAPE:           mape,
			Departments:    depts,
		})
	}
	return films
}

// applyBaseline fills in each film's BaselineEstCr / BaselineMAPE using a
// leave-one-out category-mean predictor: "guess the average total budget of
// every OTHER film in the same budget tier." It is the standard naive
// baseline for a regression task (predict the mean) and excludes the film
// itself to avoid data leakage. Comparing the hierarchical, script-driven
// system's MAPE against this baseline's MAPE is what actually demonstrates
// the system adds value over "just guess the category average" — a bare
// MAPE number on its own does not prove that.
func applyBaseline(films []BenchmarkFilm) {
	sums := map[string]float64{}
	counts := map[string]int{}
	for _, f := range films {
		sums[f.BudgetCategory] += f.TotalActualCr
		counts[f.BudgetCategory]++
	}

	for i := range films {
		f := &films[i]
		c := f.BudgetCategory
		if counts[c] <= 1 {
			f.BaselineEstCr = f.TotalActualCr
			f.BaselineMAPE = 0
			continue
		}
		// Category mean excluding this film (leave-one-out)
		loo := (sums[c] - f.TotalActualCr) / float64(counts[c]-1)
		f.BaselineEstCr = round2(loo)
		if f.TotalActualCr > 0 {
			f.BaselineMAPE = round2(math.Abs(loo-f.TotalActualCr) / f.TotalActualCr * 100)
		}
	}
}

// benchmarkCategorySummaries aggregates system MAPE (mean, std dev, min/max)
// and the naive baseline MAPE by budget category across the full benchmark
// set, plus the grand-average system and baseline MAPE.
func benchmarkCategorySummaries(films []BenchmarkFilm) ([]BenchmarkCategorySummary, float64, float64) {
	applyBaseline(films)

	order := []string{"High", "Medium", "Low"}
	mapeByCat := map[string][]float64{}
	baselineByCat := map[string][]float64{}
	var grandSum, grandBaselineSum float64

	for _, f := range films {
		c := f.BudgetCategory
		mapeByCat[c] = append(mapeByCat[c], f.MAPE)
		baselineByCat[c] = append(baselineByCat[c], f.BaselineMAPE)
		grandSum += f.MAPE
		grandBaselineSum += f.BaselineMAPE
	}

	mean := func(vals []float64) float64 {
		if len(vals) == 0 {
			return 0
		}
		var s float64
		for _, v := range vals {
			s += v
		}
		return s / float64(len(vals))
	}
	stdDev := func(vals []float64, m float64) float64 {
		if len(vals) < 2 {
			return 0
		}
		var sq float64
		for _, v := range vals {
			d := v - m
			sq += d * d
		}
		return math.Sqrt(sq / float64(len(vals)-1))
	}

	var summaries []BenchmarkCategorySummary
	for _, c := range order {
		vals := mapeByCat[c]
		if len(vals) == 0 {
			continue
		}
		m := mean(vals)
		sd := stdDev(vals, m)
		minV, maxV := vals[0], vals[0]
		for _, v := range vals {
			if v < minV {
				minV = v
			}
			if v > maxV {
				maxV = v
			}
		}
		baselineAvg := mean(baselineByCat[c])
		var improvement float64
		if baselineAvg > 0 {
			improvement = round2((baselineAvg - m) / baselineAvg * 100)
		}

		summaries = append(summaries, BenchmarkCategorySummary{
			Category:        c,
			FilmCount:       len(vals),
			AvgMAPE:         round2(m),
			StdDevMAPE:      round2(sd),
			MinMAPE:         round2(minV),
			MaxMAPE:         round2(maxV),
			BaselineAvgMAPE: round2(baselineAvg),
			ImprovementPct:  improvement,
		})
	}

	var overall, baselineOverall float64
	if len(films) > 0 {
		overall = round2(grandSum / float64(len(films)))
		baselineOverall = round2(grandBaselineSum / float64(len(films)))
	}
	return summaries, overall, baselineOverall
}

// GetEvaluationMetrics computes:
//  1. Extraction accuracy (Precision/Recall/F1) from producer verification flags
//  2. Live cost-estimation error (MAPE/Variance%) from budget items vs. expenses
//  3. Benchmark film comparison across High/Medium/Low budget Indian films
func GetEvaluationMetrics(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodIDStr := c.Param("productionId")
		prodID, err := strconv.ParseUint(prodIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid production ID"})
			return
		}

		var prod models.Production
		if err := db.First(&prod, prodID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Production not found"})
			return
		}

		// ── Extraction Accuracy ──────────────────────────────────────────────
		var elements []models.ProductionElement
		db.Where("production_id = ?", prodID).Find(&elements)

		entityTypes := []string{"Character", "Location", "Prop", "Costume", "Equipment"}
		typeStats := make(map[string]*ExtractionAccuracyByType)
		for _, et := range entityTypes {
			typeStats[et] = &ExtractionAccuracyByType{EntityType: et}
		}

		for _, el := range elements {
			stats, ok := typeStats[el.Type]
			if !ok {
				stats = &ExtractionAccuracyByType{EntityType: el.Type}
				typeStats[el.Type] = stats
			}
			if el.IsAIExtracted {
				stats.AIExtracted++
				if el.IsUserVerified {
					stats.UserVerified++ // TP
				} else {
					stats.UserRejected++ // FP
				}
			} else {
				stats.UserAdded++ // FN
				if el.IsUserVerified {
					stats.UserVerified++
				}
			}
		}

		var globalTP, globalFP, globalFN int
		var byTypeList []ExtractionAccuracyByType
		for _, et := range entityTypes {
			stats := typeStats[et]
			tp := stats.UserVerified
			fp := stats.UserRejected
			fn := stats.UserAdded
			stats.Total = tp + fn
			globalTP += tp
			globalFP += fp
			globalFN += fn
			if tp+fp > 0 {
				stats.Precision = round2(float64(tp) / float64(tp+fp))
			}
			if tp+fn > 0 {
				stats.Recall = round2(float64(tp) / float64(tp+fn))
			}
			if stats.Precision+stats.Recall > 0 {
				stats.F1Score = round2(2 * stats.Precision * stats.Recall / (stats.Precision + stats.Recall))
			}
			byTypeList = append(byTypeList, *stats)
		}

		var overallPrecision, overallRecall, overallF1 float64
		if globalTP+globalFP > 0 {
			overallPrecision = round2(float64(globalTP) / float64(globalTP+globalFP))
		}
		if globalTP+globalFN > 0 {
			overallRecall = round2(float64(globalTP) / float64(globalTP+globalFN))
		}
		if overallPrecision+overallRecall > 0 {
			overallF1 = round2(2 * overallPrecision * overallRecall / (overallPrecision + overallRecall))
		}

		// ── Live Cost-Estimation Error ────────────────────────────────────────
		var budgetItems []models.BudgetItem
		db.Where("production_id = ?", prodID).Find(&budgetItems)

		deptMap := make(map[string]*CostEstimationByDept)
		for _, item := range budgetItems {
			if _, ok := deptMap[item.Department]; !ok {
				deptMap[item.Department] = &CostEstimationByDept{Department: item.Department}
			}
			deptMap[item.Department].Estimated += item.EstimatedCost
			deptMap[item.Department].Actual += item.ActualCost
		}

		var deptList []CostEstimationByDept
		var mapeNumerator float64
		var mapeCount int
		var totalEst, totalAct float64
		hasActual := false

		for _, dept := range deptMap {
			totalEst += dept.Estimated
			totalAct += dept.Actual
			if dept.Actual > 0 {
				hasActual = true
				dept.VariancePct = round2((dept.Estimated - dept.Actual) / dept.Actual * 100)
				dept.AbsErrorPct = round2(math.Abs(dept.Estimated-dept.Actual) / dept.Actual * 100)
				mapeNumerator += dept.AbsErrorPct
				mapeCount++
			}
			dept.IsOverBudget = dept.Actual > dept.Estimated
			deptList = append(deptList, *dept)
		}

		var overallMAPE, totalVariancePct float64
		if mapeCount > 0 {
			overallMAPE = round2(mapeNumerator / float64(mapeCount))
		}
		if totalAct > 0 {
			totalVariancePct = round2((totalEst - totalAct) / totalAct * 100)
		}

		// Copy before mutating with applyBaseline — benchmarkFilms() returns
		// the shared, cached slice and concurrent requests must not write
		// to it directly.
		films := append([]BenchmarkFilm(nil), benchmarkFilms()...)
		categorySummaries, benchmarkOverallMAPE, benchmarkBaselineOverallMAPE := benchmarkCategorySummaries(films)

		c.JSON(http.StatusOK, EvaluationReport{
			ProductionID:    prod.ID,
			ProductionTitle: prod.Title,

			ExtractionByType:  byTypeList,
			OverallPrecision:  overallPrecision,
			OverallRecall:     overallRecall,
			OverallF1Score:    overallF1,
			TotalAIExtracted:  globalTP + globalFP,
			TotalUserVerified: globalTP,
			TotalUserAdded:    globalFN,
			TotalUserRejected: globalFP,

			CostByDepartment: deptList,
			OverallMAPE:      overallMAPE,
			TotalEstimated:   totalEst,
			TotalActual:      totalAct,
			TotalVariancePct: totalVariancePct,
			HasActualData:    hasActual,

			BenchmarkFilms:               films,
			BenchmarkByCategory:          categorySummaries,
			BenchmarkOverallMAPE:         benchmarkOverallMAPE,
			BenchmarkBaselineOverallMAPE: benchmarkBaselineOverallMAPE,
			BenchmarkFilmCount:           len(films),
		})
	}
}
