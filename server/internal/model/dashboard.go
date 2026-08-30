package model

import "time"

type DashboardItem struct {
	ID        uint      `json:"id" gorm:"primarykey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Section   string    `json:"section" gorm:"column:section;type:varchar(64);index;not null"` // website, account, command, path, document
	Title     string    `json:"title" gorm:"column:title;type:varchar(255);not null"`
	Content   string    `json:"content" gorm:"column:content;type:text;not null"`              // url, cmd, path, or host
	Extra     string    `json:"extra" gorm:"column:extra;type:text"`                          // json metadata e.g. {"username":"root", "password":"...", "host":"..."}
	SortOrder int       `json:"sort_order" gorm:"column:sort_order;default:0"`
}

func (DashboardItem) TableName() string {
	return "dashboard_items"
}
