package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

func getJwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		if os.Getenv("GIN_MODE") == "release" {
			panic("JWT_SECRET environment variable is required in production")
		}
		return []byte("super-secret-key-for-mvp")
	}
	return []byte(secret)
}

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header or token query required"})
			return
		}
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return getJwtSecret(), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("userID", claims["sub"])
			c.Set("orgID", claims["orgId"])
			c.Set("role", claims["role"])
		}

		c.Next()
	}
}

func RequireProductionAccess(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		prodID := c.Param("productionId")
		if prodID == "" {
			c.Next()
			return
		}

		orgID, exists := c.Get("orgID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Organization ID missing from context"})
			return
		}

		var count int64
		if err := db.Table("productions").Where("id = ? AND organization_id = ?", prodID, orgID).Count(&count).Error; err != nil || count == 0 {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied to this production"})
			return
		}

		c.Next()
	}
}
