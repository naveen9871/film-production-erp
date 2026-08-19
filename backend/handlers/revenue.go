package handlers

import (
	"film-production-erp/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AddDistributor(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.Distributor
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		orgID, _ := c.Get("orgID")
		input.OrganizationID = uint(orgID.(float64))

		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, input)
	}
}

func GetDistributors(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		var dists []models.Distributor
		db.Where("organization_id = ?", uint(orgID.(float64))).Find(&dists)
		c.JSON(http.StatusOK, dists)
	}
}

func CreateDistributionAgreement(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID, _ := strconv.ParseUint(c.Param("productionId"), 10, 32)
		var input models.DistributionAgreement
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

func GetDistributionAgreements(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		var agreements []models.DistributionAgreement
		db.Where("production_id = ?", prodID).Find(&agreements)
		c.JSON(http.StatusOK, agreements)
	}
}

func LogRevenue(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.RevenueEntry
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

func GetRevenueEntries(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		agreementID := c.Param("agreementId")
		var entries []models.RevenueEntry
		db.Where("distribution_agreement_id = ?", agreementID).Find(&entries)
		c.JSON(http.StatusOK, entries)
	}
}
