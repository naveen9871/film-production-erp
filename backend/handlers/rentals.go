package handlers

import (
	"film-production-erp/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AddEquipmentRental(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID, _ := strconv.ParseUint(c.Param("productionId"), 10, 32)
		var input models.EquipmentRental
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

func GetEquipmentRentals(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		var rentals []models.EquipmentRental
		db.Where("production_id = ?", prodID).Find(&rentals)
		c.JSON(http.StatusOK, rentals)
	}
}

func LogDamageReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.DamageReport
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

func GetDamageReports(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rentalID := c.Param("rentalId")
		var reports []models.DamageReport
		db.Where("equipment_rental_id = ?", rentalID).Find(&reports)
		c.JSON(http.StatusOK, reports)
	}
}
