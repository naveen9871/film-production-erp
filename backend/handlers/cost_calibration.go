package handlers

import (
	_ "embed"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed cost_calibration.json
var costCalibrationJSON []byte

// GetCostCalibration serves the per-scale rate-card calibration result:
// factors fitted on the 160 training films, scored on the 40-film holdout
// and by 5-fold CV. The file is produced by scripts/cost_calibration.py.
func GetCostCalibration() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Data(http.StatusOK, "application/json", costCalibrationJSON)
	}
}
