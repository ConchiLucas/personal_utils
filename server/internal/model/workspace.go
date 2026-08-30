package model

import (
	"time"
)

type Workspace struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	Name           string    `gorm:"size:100;not null" json:"name"`
	Slug           string    `gorm:"size:50;uniqueIndex;not null" json:"slug"`
	Description    string    `gorm:"size:255" json:"description"`
	HostType       string    `gorm:"size:50;default:'local_docker'" json:"host_type"` // local_docker, remote_docker, k8s
	Endpoint       string    `gorm:"size:255" json:"endpoint"`
	Color          string    `gorm:"size:50;default:'blue'" json:"color"`
	Icon           string    `gorm:"size:50;default:'container'" json:"icon"`
	IsDefault      bool      `gorm:"default:false" json:"is_default"`
	SortOrder      int       `gorm:"default:0" json:"sort_order"`
	ContainerCount int       `gorm:"-" json:"container_count"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ContainerBookmark struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	WorkspaceID   uint      `gorm:"index;not null" json:"workspace_id"`
	ContainerName string    `gorm:"size:120;index" json:"container_name"`
	DisplayTitle  string    `gorm:"size:120" json:"display_title"`
	FrontendPort  int       `json:"frontend_port"`
	CustomPath    string    `gorm:"size:255" json:"custom_path"` // e.g. /dashboard or /docs
	Notes         string    `gorm:"size:500" json:"notes"`
	IsFavorite    bool      `gorm:"default:false" json:"is_favorite"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ToolHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ToolID    string    `gorm:"size:50;index" json:"tool_id"`
	Payload   string    `gorm:"type:text" json:"payload"`
	Result    string    `gorm:"type:text" json:"result"`
	CreatedAt time.Time `json:"created_at"`
}
