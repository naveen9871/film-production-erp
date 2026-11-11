package services

import (
	"film-production-erp/models"
	"math"
	"regexp"
	"strings"
)

// SceneComplexityReport represents the explainability breakdown for a single scene
type SceneComplexityReport struct {
	SceneID         uint     `json:"sceneId"`
	SceneNumber     string   `json:"sceneNumber"`
	Heading         string   `json:"heading"`
	Location        string   `json:"location"`
	IntExt          string   `json:"intExt"`
	TimeOfDay       string   `json:"timeOfDay"`
	PageLength      float64  `json:"pageLength"`
	CharacterCount  int      `json:"characterCount"`
	Characters      []string `json:"characters"`
	PropCount       int      `json:"propCount"`
	EquipmentCount  int      `json:"equipmentCount"`
	ComplexityScore float64  `json:"complexityScore"` // 1.0 to 10.0
	EstimatedHours  float64  `json:"estimatedHours"`  // Raw estimated shooting hours
	ReconciledDays  float64  `json:"reconciledDays"`  // Scaled to match film-level predicted shoot days
	Drivers         []string `json:"drivers"`         // Explainable cost/time drivers
}

// ScriptExplainabilityResult aggregates the scene-level breakdown for a whole production
type ScriptExplainabilityResult struct {
	ProductionID        uint                    `json:"productionId"`
	TotalScenes         int                     `json:"totalScenes"`
	TotalPredictedDays  float64                 `json:"totalPredictedDays"`
	TotalEstimatedHours float64                 `json:"totalEstimatedHours"`
	AverageComplexity   float64                 `json:"averageComplexity"`
	HighestComplexity   *SceneComplexityReport  `json:"highestComplexity"`
	Scenes              []SceneComplexityReport `json:"scenes"`
}

var (
	stuntActionKeywords = []string{
		"fight", "chase", "gunshot", "shoot", "blast", "explosion", "crash",
		"sword", "stunt", "punches", "kicks", "blood", "fire", "screams",
	}
)

// AnalyzeScriptExplainability generates a rule-based per-scene shoot-time and complexity breakdown,
// reconciled against the validated film-level Random Forest shoot-day prediction.
func AnalyzeScriptExplainability(productionID uint, scenes []models.Scene, elements []models.ProductionElement, totalPredictedDays float64) ScriptExplainabilityResult {
	if len(scenes) == 0 {
		return ScriptExplainabilityResult{ProductionID: productionID}
	}

	// Elements store only the scene of first appearance, so recurring characters
	// are matched against each scene's text as well.
	type charMatcher struct {
		name    string
		sceneID uint
		re      *regexp.Regexp
	}
	var charMatchers []charMatcher
	sceneProps := make(map[uint]int)
	sceneEquip := make(map[uint]int)

	for _, el := range elements {
		switch el.Type {
		case "Character":
			charMatchers = append(charMatchers, charMatcher{el.Name, el.SceneID, elementNameRegex(el.Name)})
		case "Prop":
			sceneProps[el.SceneID]++
		case "Equipment":
			sceneEquip[el.SceneID]++
		}
	}

	var reports []SceneComplexityReport
	var rawHours []float64
	var totalHours float64
	maxIdx := -1
	var maxScore float64

	for idx, sc := range scenes {
		upperContent := strings.ToUpper(sc.Content)
		var chars []string
		for _, m := range charMatchers {
			if m.sceneID == sc.ID || (m.re != nil && m.re.MatchString(upperContent)) {
				chars = append(chars, m.name)
			}
		}
		charCount := len(chars)
		propCount := sceneProps[sc.ID]
		equipCount := sceneEquip[sc.ID]

		pageLen := sc.PageLength
		if pageLen <= 0 {
			pageLen = 0.5
		}

		// 1. Base Duration: 1 page approx 4.0 shooting hours
		baseHours := math.Max(1.5, pageLen*4.0)
		var drivers []string

		// 2. Environmental Multipliers
		multiplier := 1.0
		upperHeading := strings.ToUpper(sc.Heading)
		isExt := strings.Contains(upperHeading, "EXT.") || strings.Contains(upperHeading, "EXT ")
		isNight := strings.Contains(upperHeading, "NIGHT") || strings.Contains(upperHeading, "DUSK")

		if isExt {
			multiplier *= 1.25
			drivers = append(drivers, "Exterior location: sunlight and weather dependency (+25% time)")
		}
		if isNight {
			multiplier *= 1.35
			drivers = append(drivers, "Night photography: specialized lighting rig and crew night-shift (+35% time)")
		}

		estHours := baseHours * multiplier

		// 3. Multi-Character Setup Overhead
		if charCount > 2 {
			extraCharHours := float64(charCount-2) * 0.6
			estHours += extraCharHours
			drivers = append(drivers, "Multi-character coverage: additional camera setups for dialogue (+0.6 hrs/actor)")
		}
		if charCount >= 6 {
			estHours += 1.5
			drivers = append(drivers, "Large ensemble / crowd staging coordination (+1.5 hrs)")
		}

		// 4. Stunt / Action Density
		contentLower := strings.ToLower(sc.Content)
		hasAction := false
		for _, kw := range stuntActionKeywords {
			re := regexp.MustCompile(`\b` + regexp.QuoteMeta(kw) + `\b`)
			if re.MatchString(contentLower) {
				hasAction = true
				break
			}
		}
		if hasAction {
			estHours += 2.5
			drivers = append(drivers, "Action / stunt sequence: choreography rehearsal and safety setup (+2.5 hrs)")
		}

		// 5. Specialized Equipment Rigging
		if equipCount > 0 {
			equipHours := float64(equipCount) * 0.8
			estHours += equipHours
			drivers = append(drivers, "Specialized equipment rigging: crane/drone/gimbal repositioning (+0.8 hrs/unit)")
		}

		// 6. Complexity Score (1.0 to 10.0 scale)
		rawScore := (estHours / 8.0) * 5.0
		complexityScore := math.Min(10.0, math.Max(1.0, math.Round(rawScore*10)/10))

		scNum := sc.SceneNumber
		if scNum == "" {
			scNum = string(rune('1' + idx))
		}

		rep := SceneComplexityReport{
			SceneID:         sc.ID,
			SceneNumber:     scNum,
			Heading:         sc.Heading,
			Location:        sc.Location,
			IntExt:          sc.IntExt,
			TimeOfDay:       sc.TimeOfDay,
			PageLength:      math.Round(pageLen*100) / 100,
			CharacterCount:  charCount,
			Characters:      chars,
			PropCount:       propCount,
			EquipmentCount:  equipCount,
			ComplexityScore: complexityScore,
			EstimatedHours:  math.Round(estHours*10) / 10,
			Drivers:         drivers,
		}

		reports = append(reports, rep)
		rawHours = append(rawHours, estHours)
		totalHours += estHours

		if complexityScore > maxScore {
			maxScore = complexityScore
			maxIdx = len(reports) - 1
		}
	}

	// 7. Reconcile Scene Hours against Film-Level Total Predicted Days
	// sum(ReconciledDays) equals totalPredictedDays up to the 0.1-day rounding of each scene
	if totalHours > 0 && totalPredictedDays > 0 {
		var avgComplexity float64
		for i := range reports {
			ratio := rawHours[i] / totalHours
			reports[i].ReconciledDays = math.Round(ratio*totalPredictedDays*10) / 10
			avgComplexity += reports[i].ComplexityScore
		}
		avgComplexity = math.Round((avgComplexity/float64(len(reports)))*10) / 10

		var maxReport *SceneComplexityReport
		if maxIdx >= 0 {
			maxCopy := reports[maxIdx]
			maxReport = &maxCopy
		}

		return ScriptExplainabilityResult{
			ProductionID:        productionID,
			TotalScenes:         len(reports),
			TotalPredictedDays:  totalPredictedDays,
			TotalEstimatedHours: math.Round(totalHours*10) / 10,
			AverageComplexity:   avgComplexity,
			HighestComplexity:   maxReport,
			Scenes:              reports,
		}
	}

	return ScriptExplainabilityResult{
		ProductionID: productionID,
		TotalScenes:  len(reports),
		Scenes:       reports,
	}
}
