package main

import (
	"log"
	"fmt"

	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"golang.org/x/crypto/bcrypt"

	"film-production-erp/handlers"
	"film-production-erp/middleware"
	"film-production-erp/models"
	"film-production-erp/services"
)

var DB *gorm.DB

func initDB() {
	// Attempt to load .env, but don't fail if missing (e.g. in docker)
	godotenv.Load()

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		dbHost, dbUser, dbPassword, dbName, dbPort)
	
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect database")
	}

	// Drop tables for clean slate (Prototype Only)
	DB.Migrator().DropTable(
		&models.User{},
		&models.Production{},
		&models.Scene{},
		&models.ProductionElement{},
		&models.BudgetItem{},
		&models.Expense{},
		&models.RightsRecord{},
		&models.RateCard{},
	)

	// Auto Migrate the schema
	err = DB.AutoMigrate(
		&models.User{},
		&models.Production{},
		&models.Scene{},
		&models.ProductionElement{},
		&models.BudgetItem{},
		&models.Expense{},
		&models.RightsRecord{},
		&models.RateCard{},
	)
	if err != nil {
		log.Fatal("failed to auto migrate database schema")
	}

	// Seed admin user
	var user models.User
	if err := DB.Where("username = ?", "producer").First(&user).Error; err != nil {
		hash, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
		user = models.User{
			Username: "producer",
			HashedPassword: string(hash),
			Role: "producer",
		}
		DB.Create(&user)
	}

	// Seed default production
	var prod models.Production
	if err := DB.First(&prod).Error; err != nil {
		prod = models.Production{
			Title: "Blockbuster 2026",
			Description: "Sample feature film",
			Genre: "Action",
			BaseCurrency: "INR",
			TotalBudget: 5000000,
			Status: "draft",
		}
		DB.Create(&prod)
	}
}

func setupRouter() *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Routes
	api := r.Group("/api")
	
	// Public routes
	api.POST("/login", handlers.Login(DB))
	api.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})
	
	// Protected routes
	protected := api.Group("/")
	protected.Use(middleware.AuthRequired())
	{
		// Productions
		protected.POST("/productions", handlers.CreateProduction(DB))
		protected.GET("/productions", handlers.GetProductions(DB))
		protected.GET("/productions/:productionId", handlers.GetProduction(DB))

		// Scripts & Entities
		api.POST("/scripts/:productionId/analyze", handlers.UploadScript(DB)) // Re-using UploadScript for now
		api.GET("/scripts/:productionId/entities", handlers.GetExtractedElements(DB))
		api.GET("/projects/:productionId/entities", handlers.GetEntitiesByType(DB))
		api.PUT("/entities/:id", handlers.UpdateEntity(DB))

		// Budget
		api.POST("/budget/:productionId/quote", handlers.GenerateBudgetQuote(DB))
		api.POST("/budget/:productionId/allocate", handlers.AllocateBudget(DB))
		api.GET("/budget/:productionId", handlers.GetBudget(DB))

		// Expenses & Revenue
		api.GET("/projects/:productionId/expenses", handlers.GetExpenses(DB))
		api.POST("/projects/:productionId/expenses", handlers.AddExpense(DB))
		api.GET("/projects/:productionId/revenue", handlers.GetRightsRecords(DB))
		api.POST("/projects/:productionId/revenue", handlers.AddRightsRecord(DB))
		
		// Dashboard
		api.GET("/projects/:productionId/dashboard", handlers.GetDashboardSummary(DB))

		// Rate Cards
		api.GET("/rate-cards", handlers.GetRateCards(DB))
		api.POST("/rate-cards", handlers.CreateRateCard(DB))
		api.PUT("/rate-cards/:id", handlers.UpdateRateCard(DB))
		api.POST("/rate-cards/:id/activate", handlers.ActivateRateCard(DB))
		protected.GET("/productions/:productionId/rights", handlers.GetRightsRecords(DB))
		protected.GET("/productions/:productionId/profitability", handlers.GetProfitabilityReport(DB))
		
		// Reports
		protected.GET("/productions/:productionId/report/pdf", handlers.GenerateBudgetPDF(DB))
	}

	return r
}

func main() {
	initDB()
	
	// Load rate cards
	if err := services.LoadRateCards(); err != nil {
		log.Printf("Warning: Could not load rate cards: %v\n", err)
	}

	r := setupRouter()
	r.Run(":8080") // listen and serve on 0.0.0.0:8080
}
