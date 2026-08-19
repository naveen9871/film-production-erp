package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/time/rate"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

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

	// Configure connection pool
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(50)
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	// Only drop tables if explicitly requested for dev/demo
	if os.Getenv("ENABLE_DB_RESET") == "true" {
		log.Println("ENABLE_DB_RESET is true. Dropping tables...")
		DB.Migrator().DropTable(
			&models.User{},
			&models.Production{},
			&models.Scene{},
			&models.ProductionElement{},
			&models.ShootDay{},
			&models.BudgetVersion{},
			&models.BudgetItem{},
			&models.Vendor{},
			&models.PurchaseOrder{},
			&models.Expense{},
			&models.RightsRecord{},
			&models.RateCard{},
			&models.AuditLog{},
			&models.FXRate{},
		)
	}

	// Auto Migrate the schema
	err = DB.AutoMigrate(
		&models.Organization{},
		&models.User{},
		&models.Production{},
		&models.Scene{},
		&models.ProductionElement{},
		&models.ShootDay{},
		&models.BudgetVersion{},
		&models.BudgetItem{},
		&models.Vendor{},
		&models.PurchaseOrder{},
		&models.Expense{},
		&models.RightsRecord{},
		&models.RateCard{},
		&models.AuditLog{},
		&models.FXRate{},
		&models.ScriptVersion{},
		&models.ScriptDiff{},
		&models.PettyCashFloat{},
		&models.PettyCashReceipt{},
		&models.Distributor{},
		&models.DistributionAgreement{},
		&models.RevenueEntry{},
		&models.ArtistContract{},
		&models.ArtistPayment{},
		&models.EquipmentRental{},
		&models.DamageReport{},
		&models.StoryDocument{},
		&models.DocumentComment{},
	)
	if err != nil {
		log.Fatal("failed to auto migrate database schema")
	}

	// Seed admin user
	var user models.User
	if err := DB.Where("username = ?", "producer").First(&user).Error; err != nil {
		seedPass := os.Getenv("SEED_PASSWORD")
		if seedPass == "" {
			seedPass = "password"
		}
		hash, _ := bcrypt.GenerateFromPassword([]byte(seedPass), bcrypt.DefaultCost)
		user = models.User{
			Username:       "producer",
			HashedPassword: string(hash),
			Role:           "producer",
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

	// Rate Limiter for Login (1 request per second, burst of 3)
	limiter := rate.NewLimiter(1, 3)
	rateLimitMiddleware := func(c *gin.Context) {
		if !limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests"})
			return
		}
		c.Next()
	}

	// Public routes
	api.POST("/login", rateLimitMiddleware, handlers.Login(DB))
	api.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})
	
	// Protected routes
	protected := api.Group("/")
	protected.Use(middleware.AuthRequired())
	protected.Use(middleware.RequireProductionAccess(DB))
	{
		// Real-time Events
		protected.GET("/events/:productionId", services.SSEHeaders(), services.StreamHandler)
		
		// Productions
		protected.POST("/productions", handlers.CreateProduction(DB))
		protected.GET("/productions", handlers.GetProductions(DB))
		protected.GET("/productions/:productionId", handlers.GetProduction(DB))

		// Scripts & Entities
		protected.POST("/scripts/:productionId/analyze", handlers.UploadScript(DB)) // Re-using UploadScript for now
		protected.GET("/scripts/:productionId/entities", handlers.GetExtractedElements(DB))
		protected.GET("/projects/:productionId/entities", handlers.GetEntitiesByType(DB))
		protected.PUT("/entities/:id", handlers.UpdateEntity(DB))

		// Budget
		protected.POST("/budget/:productionId/quote", handlers.GenerateBudgetQuote(DB))
		protected.POST("/budget/:productionId/allocate", handlers.AllocateBudget(DB))
		protected.GET("/budget/:productionId", handlers.GetBudget(DB))

		// Budget Versions
		protected.GET("/productions/:productionId/budget/versions", handlers.GetBudgetVersions(DB))
		protected.POST("/productions/:productionId/budget/versions", handlers.CreateBudgetSnapshot(DB))
		protected.PUT("/budget/versions/:id/lock", handlers.LockBudgetVersion(DB))
		protected.GET("/budget/versions/:id/variance", handlers.GetVarianceReport(DB)) // Replaces old GET /projects/:id/variance

		// Expenses
		protected.GET("/projects/:productionId/expenses", handlers.GetExpenses(DB))
		protected.POST("/projects/:productionId/expenses", handlers.AddExpense(DB))

		// Vendors & POs
		protected.GET("/vendors", handlers.GetVendors(DB))
		protected.POST("/vendors", handlers.CreateVendor(DB))
		protected.GET("/vendors/:id", handlers.GetVendor(DB))
		protected.PUT("/vendors/:id", handlers.UpdateVendor(DB))
		protected.GET("/vendors/:id/pos", handlers.GetVendorPOs(DB))

		protected.GET("/productions/:productionId/pos", handlers.GetPOs(DB))
		protected.POST("/productions/:productionId/pos", handlers.RaisePO(DB))
		protected.GET("/pos/:id", handlers.GetPO(DB))
		protected.PUT("/pos/:id/approve", middleware.RequireRole(DB, "producer", "line_producer"), handlers.ApprovePO(DB))
		protected.PUT("/pos/:id/reject", middleware.RequireRole(DB, "producer", "line_producer"), handlers.RejectPO(DB))
		protected.PUT("/pos/:id/close", handlers.ClosePO(DB))

		// Schedule
		protected.GET("/productions/:productionId/schedule", handlers.GetSchedule(DB))
		protected.POST("/productions/:productionId/schedule", handlers.AddShootDay(DB))
		protected.PUT("/schedule/:id", handlers.UpdateShootDayStatus(DB))
		protected.GET("/productions/:productionId/dood", handlers.GetDOOD(DB))
		protected.GET("/productions/:productionId/schedule/call-sheet", handlers.GetCallSheet(DB))

		// FX Rates
		protected.GET("/fx-rates", handlers.GetFXRates(DB))
		protected.POST("/fx-rates", handlers.AddFXRate(DB))

		// Audit Log
		protected.GET("/productions/:productionId/audit", handlers.GetAuditLog(DB))
		protected.GET("/audit/:entityType/:entityId", handlers.GetEntityAuditLog(DB))

		// Dashboard
		protected.GET("/projects/:productionId/dashboard", handlers.GetDashboardSummary(DB))

		// Rate Cards
		protected.GET("/rate-cards", handlers.GetRateCards(DB))
		protected.POST("/rate-cards", handlers.CreateRateCard(DB))
		protected.PUT("/rate-cards/:id", handlers.UpdateRateCard(DB))
		protected.POST("/rate-cards/:id/activate", handlers.ActivateRateCard(DB))
		
		// Reports
		protected.GET("/productions/:productionId/report/pdf", handlers.GenerateBudgetPDF(DB))
		protected.GET("/productions/:productionId/report/dcr", handlers.GetDailyCostReport(DB))
		protected.GET("/report/gst-itc", handlers.GetGSTITCReport(DB))

		// Petty Cash
		protected.POST("/productions/:productionId/petty-cash/floats", handlers.IssueFloat(DB))
		protected.GET("/productions/:productionId/petty-cash/floats", handlers.GetFloats(DB))
		protected.GET("/petty-cash/floats/:id/receipts", handlers.GetFloatReceipts(DB))
		protected.POST("/petty-cash/floats/:id/receipts", handlers.LogFloatReceipt(DB))
		protected.POST("/petty-cash/floats/:id/reconcile", handlers.ReconcileFloat(DB))

		// Revenue & Distributors
		protected.POST("/distributors", handlers.AddDistributor(DB))
		protected.GET("/distributors", handlers.GetDistributors(DB))
		protected.POST("/productions/:productionId/distribution-agreements", handlers.CreateDistributionAgreement(DB))
		protected.GET("/productions/:productionId/distribution-agreements", handlers.GetDistributionAgreements(DB))
		protected.POST("/distribution-agreements/:agreementId/revenue", handlers.LogRevenue(DB))
		protected.GET("/distribution-agreements/:agreementId/revenue", handlers.GetRevenueEntries(DB))

		// Artists
		protected.POST("/productions/:productionId/artist-contracts", handlers.AddArtistContract(DB))
		protected.GET("/productions/:productionId/artist-contracts", handlers.GetArtistContracts(DB))
		protected.POST("/artist-contracts/:contractId/payments", handlers.LogArtistPayment(DB))
		protected.GET("/artist-contracts/:contractId/payments", handlers.GetArtistPayments(DB))

		// Equipment Rentals
		protected.POST("/productions/:productionId/rentals", handlers.AddEquipmentRental(DB))
		protected.GET("/productions/:productionId/rentals", handlers.GetEquipmentRentals(DB))
		protected.POST("/rentals/:rentalId/damage-reports", handlers.LogDamageReport(DB))
		protected.GET("/rentals/:rentalId/damage-reports", handlers.GetDamageReports(DB))

		// Writer's Room AI Studio
		protected.POST("/studio/documents", handlers.CreateStoryDocument(DB))
		protected.GET("/studio/documents", handlers.GetStoryDocuments(DB))
		protected.GET("/studio/documents/:id", handlers.GetStoryDocument(DB))
		protected.PUT("/studio/documents/:id", handlers.SaveStoryDocument(DB))
		protected.POST("/studio/documents/:id/comments", handlers.AddDocumentComment(DB))
		protected.GET("/studio/documents/:id/comments", handlers.GetDocumentComments(DB))
		protected.POST("/studio/documents/:id/commit", handlers.CommitToProduction(DB))
		protected.POST("/studio/documents/:id/ai-suggest", handlers.AISuggest(DB))
	}

	return r
}

func main() {
	if os.Getenv("GIN_MODE") == "release" {
		if os.Getenv("JWT_SECRET") == "" {
			log.Fatal("JWT_SECRET environment variable is required in production")
		}
		if os.Getenv("SEED_PASSWORD") == "password" || os.Getenv("SEED_PASSWORD") == "" {
			log.Println("WARNING: SEED_PASSWORD is unset or insecure in production mode")
		}
	}

	initDB()

	// Load rate cards
	if err := services.LoadRateCards(); err != nil {
		log.Printf("Warning: Could not load rate cards: %v\n", err)
	}

	r := setupRouter()

	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}
