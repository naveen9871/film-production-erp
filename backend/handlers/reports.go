package handlers

import (
	"film-production-erp/models"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
	"gorm.io/gorm"
)

func GenerateBudgetPDF(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		
		var prod models.Production
		if err := db.First(&prod, prodID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Production not found"})
			return
		}

		var items []models.BudgetItem
		db.Where("production_id = ?", prodID).Find(&items)

		pdf := gofpdf.New("P", "mm", "A4", "")
		pdf.AddPage()
		pdf.SetFont("Arial", "B", 16)
		pdf.CellFormat(190, 10, fmt.Sprintf("Budget Report: %s", prod.Title), "0", 1, "C", false, 0, "")
		
		pdf.SetFont("Arial", "", 12)
		pdf.CellFormat(190, 10, fmt.Sprintf("Total Budget: %.2f Lakhs", prod.TotalBudget), "0", 1, "C", false, 0, "")

		pdf.Ln(10)
		pdf.SetFont("Arial", "B", 12)
		pdf.CellFormat(40, 10, "Department", "1", 0, "C", false, 0, "")
		pdf.CellFormat(80, 10, "Description", "1", 0, "C", false, 0, "")
		pdf.CellFormat(40, 10, "Est. Cost (Lakhs)", "1", 0, "C", false, 0, "")
		pdf.CellFormat(30, 10, "Actual Cost", "1", 1, "C", false, 0, "")

		pdf.SetFont("Arial", "", 12)
		var totalEst, totalAct float64
		for _, item := range items {
			pdf.CellFormat(40, 10, item.Department, "1", 0, "L", false, 0, "")
			
			// Handle long description
			desc := item.Description
			if len(desc) > 30 {
				desc = desc[:27] + "..."
			}
			
			pdf.CellFormat(80, 10, desc, "1", 0, "L", false, 0, "")
			pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", item.EstimatedCost), "1", 0, "R", false, 0, "")
			pdf.CellFormat(30, 10, fmt.Sprintf("%.2f", item.ActualCost), "1", 1, "R", false, 0, "")
			totalEst += item.EstimatedCost
			totalAct += item.ActualCost
		}

		pdf.SetFont("Arial", "B", 12)
		pdf.CellFormat(120, 10, "Total", "1", 0, "R", false, 0, "")
		pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", totalEst), "1", 0, "R", false, 0, "")
		pdf.CellFormat(30, 10, fmt.Sprintf("%.2f", totalAct), "1", 1, "R", false, 0, "")

		filename := fmt.Sprintf("report_%s.pdf", prodID)
		err := pdf.OutputFileAndClose(filename)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF"})
			return
		}
		
		defer os.Remove(filename)
		c.FileAttachment(filename, fmt.Sprintf("Budget_Report_%s.pdf", prod.Title))
		pdf.Output(c.Writer)
	}
}

// GetGSTITCReport generates a breakdown of eligible Input Tax Credit (ITC) grouped by Vendor
func GetGSTITCReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		
		type ITCResult struct {
			VendorName string  `json:"vendorName"`
			GSTIN      string  `json:"gstin"`
			TaxType    string  `json:"taxType"`
			TotalTax   float64 `json:"totalTax"`
			TotalValue float64 `json:"totalValue"`
		}

		var results []ITCResult
		
		// Query joining Expenses with Vendors (since expenses belong to a production, and production to an org)
		err := db.Table("expenses").
			Select("vendors.name as vendor_name, vendors.gst_number as gstin, expenses.tax_type as tax_type, sum(expenses.tax_amount) as total_tax, sum(expenses.amount) as total_value").
			Joins("join vendors on expenses.vendor_id = vendors.id").
			Where("vendors.organization_id = ?", uint(orgID.(float64))).
			Where("vendors.gst_number != '' AND expenses.tax_amount > 0").
			Group("vendors.name, vendors.gst_number, expenses.tax_type").
			Scan(&results).Error

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
			return
		}

		c.JSON(http.StatusOK, results)
	}
}

func GetDailyCostReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		dateStr := c.Query("date")
		if dateStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Date parameter is required"})
			return
		}

		var shootDays []models.ShootDay
		if err := db.Where("production_id = ? AND DATE(scheduled_date) = ?", prodID, dateStr).Find(&shootDays).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shoot days"})
			return
		}

		elementIDs := []uint{}
		for _, sd := range shootDays {
			if sd.ElementID != 0 {
				elementIDs = append(elementIDs, sd.ElementID)
			}
		}

		var budgetItems []models.BudgetItem
		if len(elementIDs) > 0 {
			db.Where("production_id = ? AND element_id IN ?", prodID, elementIDs).Find(&budgetItems)
		}

		var expenses []models.Expense
		db.Where("production_id = ? AND DATE(transaction_date) = ?", prodID, dateStr).Find(&expenses)

		type DCRDepartment struct {
			Department string  `json:"department"`
			Estimated  float64 `json:"estimated"`
			Actual     float64 `json:"actual"`
			Variance   float64 `json:"variance"`
		}

		deptMap := make(map[string]*DCRDepartment)

		totalEst := 0.0
		for _, item := range budgetItems {
			dept := item.Department
			if dept == "" {
				dept = "General"
			}
			if _, exists := deptMap[dept]; !exists {
				deptMap[dept] = &DCRDepartment{Department: dept}
			}
			
			// Pro-rate daily cost
			dailyCost := item.EstimatedCost
			if item.Quantity > 0 {
				dailyCost = item.EstimatedCost / item.Quantity
			}
			deptMap[dept].Estimated += dailyCost
			totalEst += dailyCost
		}

		totalAct := 0.0
		for _, exp := range expenses {
			// Find department from budget item
			var bi models.BudgetItem
			dept := "General"
			if db.First(&bi, exp.BudgetItemID).Error == nil && bi.Department != "" {
				dept = bi.Department
			}

			if _, exists := deptMap[dept]; !exists {
				deptMap[dept] = &DCRDepartment{Department: dept}
			}
			deptMap[dept].Actual += exp.Amount
			totalAct += exp.Amount
		}

		var depts []DCRDepartment
		for _, v := range deptMap {
			v.Variance = v.Estimated - v.Actual
			depts = append(depts, *v)
		}

		c.JSON(http.StatusOK, gin.H{
			"date": dateStr,
			"totalEstimated": totalEst,
			"totalActual": totalAct,
			"totalVariance": totalEst - totalAct,
			"departments": depts,
		})
	}
}
