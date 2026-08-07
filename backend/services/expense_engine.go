package services

import (
	"film-production-erp/models"
)

type VarianceReport struct {
	Department     string  `json:"department"`
	EstimatedCost  float64 `json:"estimatedCost"`
	ActualCost     float64 `json:"actualCost"`
	Variance       float64 `json:"variance"`
	VariancePercent float64 `json:"variancePercent"`
}

// ComputeVariance calculates the difference between estimated and actual cost
func ComputeVariance(budgetItems []models.BudgetItem) map[string]VarianceReport {
	report := make(map[string]VarianceReport)

	for _, item := range budgetItems {
		dept := item.Department
		if _, exists := report[dept]; !exists {
			report[dept] = VarianceReport{Department: dept}
		}

		current := report[dept]
		current.EstimatedCost += item.EstimatedCost
		current.ActualCost += item.ActualCost
		current.Variance = current.EstimatedCost - current.ActualCost
		if current.EstimatedCost > 0 {
			current.VariancePercent = (current.Variance / current.EstimatedCost) * 100
		}
		report[dept] = current
	}

	return report
}
