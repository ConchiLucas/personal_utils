package model

import "time"

type FileRecord struct {
	ID           uint      `json:"id" gorm:"primarykey"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	FileName     string    `json:"file_name" gorm:"column:file_name;type:varchar(255);not null"`
	OriginalName string    `json:"original_name" gorm:"column:original_name;type:varchar(255);not null"`
	FileSize     int64     `json:"file_size" gorm:"column:file_size;not null"`
	MimeType     string    `json:"mime_type" gorm:"column:mime_type;type:varchar(128)"`
	Ext          string    `json:"ext" gorm:"column:ext;type:varchar(32);index"`
	Bucket       string    `json:"bucket" gorm:"column:bucket;type:varchar(128);not null"`
	ObjectKey    string    `json:"object_key" gorm:"column:object_key;type:varchar(512);uniqueIndex;not null"`
	URL          string    `json:"url" gorm:"column:url;type:varchar(1024)"`
}

func (FileRecord) TableName() string {
	return "file_records"
}
