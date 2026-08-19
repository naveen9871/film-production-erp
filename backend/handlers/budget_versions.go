package handlers

import (
	"net/http"
	"strconv"

	"film-production-erp/models"
	"film-production-erp/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetBudgetVersions returns all budget snapshots for a production
func GetBudgetVersions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productionID := c.Param("productionId")
		var versions []models.BudgetVersion
		if err := db.Where("production_id = ?", productionID).Order("created_at desc").Find(&versions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, versions)
	}
}

// CreateBudgetSnapshot creates a new budget snapshot
func CreateBudgetSnapshot(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productionID, _ := strconv.ParseUint(c.Param("productionId"), 10, 32)
		var input struct {
			Label string `json:"label"`
			Notes string `json:"notes"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		version, err := services.CreateSnapshot(db, uint(productionID), input.Label, input.Notes)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, version)
	}
}

// LockBudgetVersion locks a specific budget version
func LockBudgetVersion(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
		userID := c.GetUint("userID")
		orgID, _ := c.Get("orgID")

		var version models.BudgetVersion
		if err := db.First(&version, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}
		var prod models.Production
		if err := db.First(&prod, version.ProductionID).Error; err != nil || prod.OrganizationID != uint(orgID.(float64)) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		if err := services.LockVersion(db, uint(id), userID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		services.GlobalBroker.Broadcast(prod.ID, "budget_locked", id)
		c.JSON(http.StatusOK, gin.H{"message": "Budget version locked"})
	}
}

// GetVarianceReport generates a variance report for a locked budget
func GetVarianceReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
		orgID, _ := c.Get("orgID")

		var version models.BudgetVersion
		if err := db.First(&version, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}
		var prod models.Production
		if err := db.First(&prod, version.ProductionID).Error; err != nil || prod.OrganizationID != uint(orgID.(float64)) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		report, err := services.GetVarianceReport(db, uint(id))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, report)
	}
}
