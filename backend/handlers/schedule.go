package handlers

import (
	"net/http"

	"film-production-erp/models"
	"film-production-erp/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetSchedule returns the shoot schedule for a production
func GetSchedule(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productionID := c.Param("productionId")
		var days []models.ShootDay
		if err := db.Where("production_id = ?", productionID).Order("scheduled_date asc").Find(&days).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, days)
	}
}

// AddShootDay adds a new shoot day entry
func AddShootDay(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.ShootDay
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		services.GlobalBroker.Broadcast(input.ProductionID, "schedule_updated", input)
		c.JSON(http.StatusCreated, input)
	}
}

// UpdateShootDayStatus updates a shoot day status
func UpdateShootDayStatus(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var input struct {
			Status string `json:"status"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var day models.ShootDay
		if err := db.First(&day, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Shoot day not found"})
			return
		}
		
		orgID, _ := c.Get("orgID")
		var prod models.Production
		if err := db.First(&prod, day.ProductionID).Error; err != nil || prod.OrganizationID != uint(orgID.(float64)) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		day.Status = input.Status
		if err := db.Save(&day).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		services.GlobalBroker.Broadcast(day.ProductionID, "schedule_updated", day)
		c.JSON(http.StatusOK, day)
	}
}

// GetDOOD returns the Day-Out-Of-Days report for entities
func GetDOOD(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productionID := c.Param("productionId")
		
		// Note: A real DOOD report requires joining entities and grouping by day
		// For now, we return the raw schedule data sorted by element
		var days []models.ShootDay
		if err := db.Where("production_id = ?", productionID).Order("element_id asc, scheduled_date asc").Find(&days).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, days)
	}
}

func GetCallSheet(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		dateStr := c.Query("date")
		if dateStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Date parameter is required"})
			return
		}

		var shootDays []models.ShootDay
		if err := db.Where("production_id = ? AND DATE(scheduled_date) = ?", prodID, dateStr).Find(&shootDays).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch schedule"})
			return
		}

		type CallSheetItem struct {
			Name     string `json:"name"`
			CallTime string `json:"callTime"`
			Role     string `json:"role,omitempty"`
		}

		type CallSheetResponse struct {
			Date      string          `json:"date"`
			Scenes    []CallSheetItem `json:"scenes"`
			Cast      []CallSheetItem `json:"cast"`
			Crew      []CallSheetItem `json:"crew"`
			Locations []CallSheetItem `json:"locations"`
			Equipment []CallSheetItem `json:"equipment"`
		}

		resp := CallSheetResponse{
			Date:      dateStr,
			Scenes:    []CallSheetItem{},
			Cast:      []CallSheetItem{},
			Crew:      []CallSheetItem{},
			Locations: []CallSheetItem{},
			Equipment: []CallSheetItem{},
		}

		// To prevent duplicate scenes
		sceneMap := make(map[uint]bool)

		for _, sd := range shootDays {
			if sd.SceneID != 0 && !sceneMap[sd.SceneID] {
				var scene models.Scene
				if db.First(&scene, sd.SceneID).Error == nil {
					resp.Scenes = append(resp.Scenes, CallSheetItem{
						Name:     scene.Heading,
						CallTime: sd.CallTime,
					})
					sceneMap[sd.SceneID] = true
				}
			}

			if sd.ElementID != 0 {
				var el models.ProductionElement
				if db.First(&el, sd.ElementID).Error == nil {
					item := CallSheetItem{
						Name:     el.Name,
						CallTime: sd.CallTime,
						Role:     el.SubCategory,
					}
					switch el.Type {
					case "Cast":
						resp.Cast = append(resp.Cast, item)
					case "Crew":
						resp.Crew = append(resp.Crew, item)
					case "Location":
						resp.Locations = append(resp.Locations, item)
					case "Equipment":
						resp.Equipment = append(resp.Equipment, item)
					}
				}
			}
		}

		c.JSON(http.StatusOK, resp)
	}
}
