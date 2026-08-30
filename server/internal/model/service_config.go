package model

import "time"

type ServiceConfig struct {
	ID             uint      `json:"id" gorm:"primarykey"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Name           string    `json:"name" gorm:"column:name;type:varchar(255);not null"`
	Slug           string    `json:"slug" gorm:"column:slug;type:varchar(128);uniqueIndex;not null"`
	Description    string    `json:"description" gorm:"column:description;type:text"`
	ServiceType    string    `json:"service_type" gorm:"column:service_type;type:varchar(64);default:'host_process'"` // host_process, brew_service, docker, script
	ProcessPattern string    `json:"process_pattern" gorm:"column:process_pattern;type:varchar(255);not null"`
	Port           int       `json:"port" gorm:"column:port;default:0"`
	ConfigPath     string    `json:"config_path" gorm:"column:config_path;type:varchar(512);not null"`
	StartCmd       string    `json:"start_cmd" gorm:"column:start_cmd;type:text"`
	StopCmd        string    `json:"stop_cmd" gorm:"column:stop_cmd;type:text"`
	RestartCmd     string    `json:"restart_cmd" gorm:"column:restart_cmd;type:text"`
	SortOrder      int       `json:"sort_order" gorm:"column:sort_order;default:0"`

	// Runtime fields (Not stored in DB, computed on the fly)
	Status           string  `json:"status" gorm:"-"` // running, stopped, unknown
	PID              int     `json:"pid" gorm:"-"`
	CPUPercent       float64 `json:"cpu_percent" gorm:"-"`
	MemoryMB         float64 `json:"memory_mb" gorm:"-"`
	Uptime           string  `json:"uptime" gorm:"-"`
	ConfigFileExists bool    `json:"config_file_exists" gorm:"-"`
}

func (ServiceConfig) TableName() string {
	return "service_configs"
}
