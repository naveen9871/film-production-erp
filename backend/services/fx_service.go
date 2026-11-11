package services

import (
	"errors"
	"time"

	"film-production-erp/models"
	"gorm.io/gorm"
)

// GetRate retrieves the most recent exchange rate between two currencies
func GetRate(db *gorm.DB, from string, to string, date time.Time) (float64, error) {
	if from == to {
		return 1.0, nil
	}

	var rate models.FXRate
	if err := db.Where("base_currency = ? AND to_currency = ? AND effective_date <= ?", from, to, date).
		Order("effective_date desc").First(&rate).Error; err != nil {

		// Try reverse mapping (To -> From) and invert rate
		var revRate models.FXRate
		if err2 := db.Where("base_currency = ? AND to_currency = ? AND effective_date <= ?", to, from, date).
			Order("effective_date desc").First(&revRate).Error; err2 != nil {
			return 0, errors.New("exchange rate not found")
		}
		return 1.0 / revRate.Rate, nil
	}

	return rate.Rate, nil
}

// ConvertAmount converts an amount using the rate valid on the given date
func ConvertAmount(db *gorm.DB, amount float64, from string, to string, date time.Time) (float64, error) {
	rate, err := GetRate(db, from, to, date)
	if err != nil {
		return 0, err
	}
	return amount * rate, nil
}

// SeedManualRate adds a manual exchange rate
func SeedManualRate(db *gorm.DB, from string, to string, rate float64) error {
	fx := models.FXRate{
		BaseCurrency:  from,
		ToCurrency:    to,
		Rate:          rate,
		EffectiveDate: time.Now(),
		Source:        "manual",
	}
	return db.Create(&fx).Error
}
