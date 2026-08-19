package middleware

import (
	"net/http"

	"film-production-erp/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RequireRole restricts access to specified roles
func RequireRole(db *gorm.DB, allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		
		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		for _, role := range allowedRoles {
			if user.Role == role {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: insufficient permissions"})
	}
}

// RequireDepartment restricts access to users belonging to specified departments
func RequireDepartment(db *gorm.DB, allowedDepts ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		
		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		for _, dept := range allowedDepts {
			if user.Department == dept {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: department mismatch"})
	}
}
