package handlers

import (
	"film-production-erp/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetDashboardSummary(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")

		var prod models.Production
		if err := db.First(&prod, prodID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Production not found"})
			return
		}

		var totalEstimatedCost, totalActualCost, totalVariance float64

		// Sum up budget items in one query
		db.Model(&models.BudgetItem{}).
			Where("production_id = ?", prodID).
			Select("COALESCE(SUM(estimated_cost), 0), COALESCE(SUM(actual_cost), 0), COALESCE(SUM(variance), 0)").
			Row().
			Scan(&totalEstimatedCost, &totalActualCost, &totalVariance)

		var totalExpectedRevenue, totalActualRevenue float64

		// Sum up revenue items in one query
		db.Model(&models.RightsRecord{}).
			Where("production_id = ?", prodID).
			Select("COALESCE(SUM(expected_revenue), 0), COALESCE(SUM(actual_revenue), 0)").
			Row().
			Scan(&totalExpectedRevenue, &totalActualRevenue)

		c.JSON(http.StatusOK, gin.H{
			"totalBudget":          prod.TotalBudget,
			"totalEstimatedCost":   totalEstimatedCost,
			"totalActualCost":      totalActualCost,
			"totalVariance":        totalVariance,
			"totalExpectedRevenue": totalExpectedRevenue,
			"totalActualRevenue":   totalActualRevenue,
		})
	}
}
