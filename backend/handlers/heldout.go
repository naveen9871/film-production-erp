package handlers

import (
	_ "embed"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed heldout_results.json
var heldoutResultsJSON []byte

// GetHeldOutEvaluation serves the final-evaluation generalization test:
// a stratified 40-film holdout plus a budget-tier shift. The file is
// produced by scripts/heldout_generalization.py and embedded so the
// dashboard cannot drift from the script output.
func GetHeldOutEvaluation() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Data(http.StatusOK, "application/json", heldoutResultsJSON)
	}
}
