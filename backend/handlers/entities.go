package handlers

import (
	"film-production-erp/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func UpdateEntity(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var entity models.ProductionElement
		if err := db.First(&entity, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Entity not found"})
			return
		}

		orgID, _ := c.Get("orgID")
		var prod models.Production
		if err := db.First(&prod, entity.ProductionID).Error; err != nil || prod.OrganizationID != uint(orgID.(float64)) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		var updateData map[string]interface{}
		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		db.Model(&entity).Updates(updateData)
		c.JSON(http.StatusOK, entity)
	}
}

func GetEntitiesByType(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		entityType := c.Query("type")

		var elements []models.ProductionElement
		query := db.Where("production_id = ?", prodID)
		if entityType != "" {
			query = query.Where("type = ?", entityType)
		}
		query.Find(&elements)

		c.JSON(http.StatusOK, elements)
	}
}
