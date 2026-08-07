package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"film-production-erp/handlers"
	"film-production-erp/middleware"
	"film-production-erp/models"
	"film-production-erp/services"
)

var DB *gorm.DB

func initDB() {
	var err error
	DB, err = gorm.Open(sqlite.Open("erp.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect database")
	}

	// Auto Migrate the schema
	err = DB.AutoMigrate(
		&models.Production{},
		&models.Scene{},
		&models.ProductionElement{},
		&models.BudgetItem{},
		&models.Expense{},
		&models.RightsRecord{},
	)
	if err != nil {
		log.Fatal("failed to auto migrate database schema")
	}
}

func setupRouter() *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
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
	api.POST("/login", handlers.Login)
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

		// Script Analysis
		protected.POST("/productions/:productionId/script", handlers.UploadScript(DB))
		protected.GET("/productions/:productionId/elements", handlers.GetExtractedElements(DB))

		// Budget
		protected.POST("/productions/:productionId/budget/quote", handlers.GenerateBudgetQuote(DB))
		protected.POST("/productions/:productionId/budget/allocate", handlers.AllocateBudget(DB))
		protected.GET("/productions/:productionId/budget", handlers.GetBudget(DB))

		// Expenses
		protected.POST("/productions/:productionId/expenses", handlers.AddExpense(DB))
		protected.GET("/productions/:productionId/expenses", handlers.GetExpenses(DB))
		protected.GET("/productions/:productionId/variance", handlers.GetVarianceReport(DB))

		// Revenue
		protected.POST("/productions/:productionId/rights", handlers.AddRightsRecord(DB))
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
