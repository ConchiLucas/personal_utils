package model

import "time"

// ProjectDirectory represents a workspace directory containing frontend/backend projects
type ProjectDirectory struct {
	ID          uint             `json:"id" gorm:"primarykey"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
	Name        string           `json:"name" gorm:"column:name;type:varchar(255);not null"`
	Slug        string           `json:"slug" gorm:"column:slug;type:varchar(128);uniqueIndex;not null"`
	Category    string           `json:"category" gorm:"column:category;type:varchar(128);default:'default'"`
	Path        string           `json:"path" gorm:"column:path;type:varchar(512);not null"`
	Description string           `json:"description" gorm:"column:description;type:text"`
	Icon        string           `json:"icon" gorm:"column:icon;type:varchar(64);default:'folder'"`
	SortOrder   int              `json:"sort_order" gorm:"column:sort_order;default:0"`
	Services    []ProjectService `json:"services,omitempty" gorm:"foreignKey:DirectoryID"`

	// Runtime fields
	TotalServices   int  `json:"total_services" gorm:"-"`
	RunningServices int  `json:"running_services" gorm:"-"`
	PathExists      bool `json:"path_exists" gorm:"-"`
}

func (ProjectDirectory) TableName() string {
	return "project_directories"
}

// ProjectService represents a single frontend/backend/worker project within a directory
type ProjectService struct {
	ID           uint      `json:"id" gorm:"primarykey"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	DirectoryID  uint      `json:"directory_id" gorm:"column:directory_id;index;not null"`
	Name         string    `json:"name" gorm:"column:name;type:varchar(255);not null"`
	Role         string    `json:"role" gorm:"column:role;type:varchar(64);not null"` // backend, frontend, worker, service, fullstack
	Language     string    `json:"language" gorm:"column:language;type:varchar(128);not null"`
	Framework    string    `json:"framework" gorm:"column:framework;type:varchar(128)"`
	RelativePath string    `json:"relative_path" gorm:"column:relative_path;type:varchar(255);not null"`
	Port         int       `json:"port" gorm:"column:port;default:0"`
	InternalPort int       `json:"internal_port" gorm:"column:internal_port;default:0"`
	Description  string    `json:"description" gorm:"column:description;type:text"`
	StartCmd     string    `json:"start_cmd" gorm:"column:start_cmd;type:text"`
	DevCmd       string    `json:"dev_cmd" gorm:"column:dev_cmd;type:text"`
	Endpoints    string    `json:"endpoints" gorm:"column:endpoints;type:text"` // JSON array or comma-separated links e.g. [{"label":"Web","url":"http://..."},{"label":"Swagger","url":"http://.../docs"}]
	SortOrder    int       `json:"sort_order" gorm:"column:sort_order;default:0"`

	// Runtime fields
	Status       string `json:"status" gorm:"-"` // running, stopped
	AbsolutePath string `json:"absolute_path" gorm:"-"`
	PathExists   bool   `json:"path_exists" gorm:"-"`
}

func (ProjectService) TableName() string {
	return "project_services"
}
