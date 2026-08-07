package services

import (
	"film-production-erp/models"
)

type ProfitabilityReport struct {
	TotalEstimatedCost float64 `json:"totalEstimatedCost"`
	TotalActualCost    float64 `json:"totalActualCost"`
	TotalRevenue       float64 `json:"totalRevenue"`
	ProfitLoss         float64 `json:"profitLoss"`
	ROI                float64 `json:"roi"`
	IsBreakeven        bool    `json:"isBreakeven"`
}

// ComputeProfitability calculates P&L and ROI
func ComputeProfitability(budgetItems []models.BudgetItem, rightsRecords []models.RightsRecord) ProfitabilityReport {
	report := ProfitabilityReport{}

	for _, item := range budgetItems {
		report.TotalEstimatedCost += item.EstimatedCost
		report.TotalActualCost += item.ActualCost
	}

	for _, right := range rightsRecords {
		report.TotalRevenue += right.ActualRevenue
	}

	report.ProfitLoss = report.TotalRevenue - report.TotalActualCost

	if report.TotalActualCost > 0 {
		report.ROI = (report.ProfitLoss / report.TotalActualCost) * 100
	}

	report.IsBreakeven = report.TotalRevenue >= report.TotalActualCost

	return report
}
