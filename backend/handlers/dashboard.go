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

		var totalEstimatedCost float64
		var totalActualCost float64
		var totalVariance float64

		// Sum up budget items
		db.Model(&models.BudgetItem{}).Where("production_id = ?", prodID).Select("sum(estimated_cost)").Row().Scan(&totalEstimatedCost)
		db.Model(&models.BudgetItem{}).Where("production_id = ?", prodID).Select("sum(actual_cost)").Row().Scan(&totalActualCost)
		db.Model(&models.BudgetItem{}).Where("production_id = ?", prodID).Select("sum(variance)").Row().Scan(&totalVariance)

		var totalExpectedRevenue float64
		var totalActualRevenue float64

		// Sum up revenue items
		db.Model(&models.RightsRecord{}).Where("production_id = ?", prodID).Select("sum(expected_revenue)").Row().Scan(&totalExpectedRevenue)
		db.Model(&models.RightsRecord{}).Where("production_id = ?", prodID).Select("sum(actual_revenue)").Row().Scan(&totalActualRevenue)

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
