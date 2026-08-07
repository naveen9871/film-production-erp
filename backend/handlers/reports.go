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
	}
}
