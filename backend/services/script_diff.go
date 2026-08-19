package services

import (
	"encoding/json"
	"film-production-erp/models"
	"gorm.io/gorm"
)

// CompareScriptVersions generates a diff between two script versions
func CompareScriptVersions(db *gorm.DB, productionID, baseVersionID, targetVersionID uint) *models.ScriptDiff {
	var baseScenes []models.Scene
	var targetScenes []models.Scene

	db.Where("script_version_id = ?", baseVersionID).Find(&baseScenes)
	db.Where("script_version_id = ?", targetVersionID).Find(&targetScenes)

	var baseElements []models.ProductionElement
	var targetElements []models.ProductionElement

	db.Where("script_version_id = ?", baseVersionID).Find(&baseElements)
	db.Where("script_version_id = ?", targetVersionID).Find(&targetElements)

	addedScenes, removedScenes, modifiedScenes := 0, 0, 0
	addedElements, removedElements := 0, 0

	// Map base scenes by SceneNumber
	baseSceneMap := make(map[string]models.Scene)
	for _, s := range baseScenes {
		baseSceneMap[s.SceneNumber] = s
	}

	// Compare scenes
	for _, ts := range targetScenes {
		if bs, ok := baseSceneMap[ts.SceneNumber]; !ok {
			addedScenes++
		} else {
			// Check if modified (simple content length check for MVP, or exact string match)
			if bs.Content != ts.Content || bs.Heading != ts.Heading {
				modifiedScenes++
			}
			delete(baseSceneMap, ts.SceneNumber)
		}
	}
	removedScenes = len(baseSceneMap)

	// Build element keys (Type:Name:SceneNumber) for base
	// Since Elements point to SceneID, we need to resolve SceneID to SceneNumber
	baseSceneIDToNum := make(map[uint]string)
	for _, s := range baseScenes {
		baseSceneIDToNum[s.ID] = s.SceneNumber
	}
	targetSceneIDToNum := make(map[uint]string)
	for _, s := range targetScenes {
		targetSceneIDToNum[s.ID] = s.SceneNumber
	}

	baseElemMap := make(map[string]bool)
	for _, e := range baseElements {
		sceneNum := baseSceneIDToNum[e.SceneID]
		key := e.Type + ":" + e.Name + ":" + sceneNum
		baseElemMap[key] = true
	}

	for _, e := range targetElements {
		sceneNum := targetSceneIDToNum[e.SceneID]
		key := e.Type + ":" + e.Name + ":" + sceneNum
		if _, ok := baseElemMap[key]; !ok {
			addedElements++
		} else {
			delete(baseElemMap, key)
		}
	}
	removedElements = len(baseElemMap)

	diffDetails := map[string]interface{}{
		"summary": "Diff completed successfully",
	}
	diffBytes, _ := json.Marshal(diffDetails)

	diff := models.ScriptDiff{
		ProductionID:    productionID,
		BaseVersionID:   baseVersionID,
		TargetVersionID: targetVersionID,
		AddedScenes:     addedScenes,
		RemovedScenes:   removedScenes,
		ModifiedScenes:  modifiedScenes,
		AddedElements:   addedElements,
		RemovedElements: removedElements,
		DiffDetails:     string(diffBytes),
	}

	db.Create(&diff)
	return &diff
}
