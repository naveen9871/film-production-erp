package handlers

import (
	"film-production-erp/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AddArtistContract(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID, _ := strconv.ParseUint(c.Param("productionId"), 10, 32)
		var input models.ArtistContract
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		input.ProductionID = uint(prodID)

		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, input)
	}
}

func GetArtistContracts(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		var contracts []models.ArtistContract
		db.Where("production_id = ?", prodID).Find(&contracts)
		c.JSON(http.StatusOK, contracts)
	}
}

func LogArtistPayment(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.ArtistPayment
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, input)
	}
}

func GetArtistPayments(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		contractID := c.Param("contractId")
		var payments []models.ArtistPayment
		db.Where("artist_contract_id = ?", contractID).Find(&payments)
		c.JSON(http.StatusOK, payments)
	}
}
