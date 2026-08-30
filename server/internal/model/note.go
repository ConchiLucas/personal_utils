package model

import (
	"time"
)

type Note struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Title     string    `gorm:"size:200;not null" json:"title"`
	Slug      string    `gorm:"size:100;index" json:"slug"`
	Category  string    `gorm:"size:50;index;default:'General'" json:"category"` // DevOps, Database, Architecture, Prompt, QuickSnippet
	Tags      string    `gorm:"size:255" json:"tags"`                            // Comma separated tags
	Content   string    `gorm:"type:text;not null" json:"content"`               // Markdown text
	IsPinned  bool      `gorm:"default:false" json:"is_pinned"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
