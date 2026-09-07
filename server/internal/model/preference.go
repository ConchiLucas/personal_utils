package model

import "time"

type UserPreference struct {
	Key       string    `json:"key" gorm:"primaryKey;size:100;column:key"`
	Value     string    `json:"value" gorm:"type:text;column:value"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (UserPreference) TableName() string {
	return "user_preferences"
}
