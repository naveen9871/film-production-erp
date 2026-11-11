package handlers

import (
	"net/http"

	"film-production-erp/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetAuditLog returns paginated audit log for a production
func GetAuditLog(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var logs []models.AuditLog
		// In a real app, join with production ID or filter by related entities
		if err := db.Order("created_at desc").Limit(100).Find(&logs).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, logs)
	}
}

// GetEntityAuditLog returns the audit trail for a specific entity
func GetEntityAuditLog(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		entityType := c.Param("entityType")
		entityID := c.Param("entityId")

		var logs []models.AuditLog
		if err := db.Where("entity_type = ? AND entity_id = ?", entityType, entityID).Order("created_at desc").Find(&logs).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, logs)
	}
}
