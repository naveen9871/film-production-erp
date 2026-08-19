package handlers

import (
	"net/http"

	"film-production-erp/models"
	"film-production-erp/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetVendors returns all vendors
func GetVendors(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		var vendors []models.Vendor
		if err := db.Where("organization_id = ?", uint(orgID.(float64))).Find(&vendors).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, vendors)
	}
}

// CreateVendor creates a new vendor
func CreateVendor(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input models.Vendor
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

		userID := c.GetUint("userID")
		services.LogAudit(db, userID, "CREATE", "Vendor", input.ID, nil, input, c.ClientIP())

		c.JSON(http.StatusCreated, input)
	}
}

// GetVendor returns a specific vendor
func GetVendor(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		id := c.Param("id")
		var vendor models.Vendor
		if err := db.Where("organization_id = ?", uint(orgID.(float64))).First(&vendor, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vendor not found"})
			return
		}
		c.JSON(http.StatusOK, vendor)
	}
}

// UpdateVendor updates a specific vendor
func UpdateVendor(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := c.Get("orgID")
		id := c.Param("id")
		var vendor models.Vendor
		if err := db.Where("organization_id = ?", uint(orgID.(float64))).First(&vendor, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vendor not found"})
			return
		}

		oldVendor := vendor

		if err := c.ShouldBindJSON(&vendor); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := db.Save(&vendor).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		userID := c.GetUint("userID")
		services.LogAudit(db, userID, "UPDATE", "Vendor", vendor.ID, oldVendor, vendor, c.ClientIP())

		c.JSON(http.StatusOK, vendor)
	}
}

// GetVendorPOs returns POs for a specific vendor
func GetVendorPOs(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var pos []models.PurchaseOrder
		if err := db.Where("vendor_id = ?", id).Find(&pos).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, pos)
	}
}
