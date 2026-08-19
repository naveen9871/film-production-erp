package services

import (
	"encoding/json"
	"time"

	"film-production-erp/models"
	"gorm.io/gorm"
)

// LogAudit creates an immutable audit trail record
func LogAudit(db *gorm.DB, userID uint, action string, entityType string, entityID uint, oldVal interface{}, newVal interface{}, ipAddress string) error {
	var oldJSON, newJSON []byte
	var err error

	if oldVal != nil {
		oldJSON, err = json.Marshal(oldVal)
		if err != nil {
			oldJSON = []byte("{}")
		}
	} else {
		oldJSON = []byte("{}")
	}

	if newVal != nil {
		newJSON, err = json.Marshal(newVal)
		if err != nil {
			newJSON = []byte("{}")
		}
	} else {
		newJSON = []byte("{}")
	}

	audit := models.AuditLog{
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		OldValue:   string(oldJSON),
		NewValue:   string(newJSON),
		IPAddress:  ipAddress,
		CreatedAt:  time.Now(),
	}

	return db.Create(&audit).Error
}
