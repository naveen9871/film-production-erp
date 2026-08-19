package handlers

import (
	"film-production-erp/models"
	"net/http"
	"os"
	"time"

	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func Login(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user models.User
		if err := db.Where("username = ?", req.Username).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub":   user.ID,
			"orgId": user.OrganizationID,
			"role":  user.Role,
			"exp":   time.Now().Add(time.Hour * 24).Unix(),
		})

		// Get secret from env
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			if os.Getenv("GIN_MODE") == "release" {
				panic("JWT_SECRET environment variable is required in production")
			}
			secret = "super-secret-key-for-mvp"
		}

		tokenString, err := token.SignedString([]byte(secret))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": tokenString,
			"user": gin.H{
				"id":             user.ID,
				"organizationId": user.OrganizationID,
				"username":       user.Username,
				"role":           user.Role,
			},
		})
	}
}
