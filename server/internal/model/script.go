package model

import "time"

type ScriptCategory struct {
	ID          uint      `json:"id" gorm:"primarykey"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Name        string    `json:"name" gorm:"column:name;type:varchar(128);not null"`
	Slug        string    `json:"slug" gorm:"column:slug;type:varchar(128);uniqueIndex;not null"`
	Description string    `json:"description" gorm:"column:description;type:text"`
	Icon        string    `json:"icon" gorm:"column:icon;type:varchar(64);default:'terminal'"`
	Color       string    `json:"color" gorm:"column:color;type:varchar(64);default:'blue'"`
	SortOrder   int       `json:"sort_order" gorm:"column:sort_order;default:0"`
	ScriptCount int       `json:"script_count" gorm:"-"`
}

func (ScriptCategory) TableName() string {
	return "script_categories"
}

type ScriptItem struct {
	ID             uint       `json:"id" gorm:"primarykey"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	CategoryID     uint       `json:"category_id" gorm:"column:category_id;index;not null"`
	CategorySlug   string     `json:"category_slug" gorm:"column:category_slug;type:varchar(128);index"`
	Name           string     `json:"name" gorm:"column:name;type:varchar(255);not null"`
	Description    string     `json:"description" gorm:"column:description;type:text"`
	ScriptType     string     `json:"script_type" gorm:"column:script_type;type:varchar(32);default:'bash'"` // bash, python, node, sh
	ExecMode       string     `json:"exec_mode" gorm:"column:exec_mode;type:varchar(32);default:'direct'"`    // direct (直接执行), dynamic (动态传参)
	Content        string     `json:"content" gorm:"column:content;type:text;not null"`
	ParamsSchema   string     `json:"params_schema" gorm:"column:params_schema;type:text"` // JSON schema: [{"key":"VAR","label":"名称","type":"string|number|select","default":"...","options":[...]}]
	DefaultParams  string     `json:"default_params" gorm:"column:default_params;type:text"`
	WorkingDir     string     `json:"working_dir" gorm:"column:working_dir;type:text"`
	TimeoutSec     int        `json:"timeout_sec" gorm:"column:timeout_sec;default:60"`
	LastStatus     string     `json:"last_status" gorm:"column:last_status;type:varchar(32)"` // success, failed, running
	LastRunAt      *time.Time `json:"last_run_at" gorm:"column:last_run_at"`
	LastDurationMs int64      `json:"last_duration_ms" gorm:"column:last_duration_ms;default:0"`
	RunCount       int        `json:"run_count" gorm:"column:run_count;default:0"`
}

func (ScriptItem) TableName() string {
	return "script_items"
}

type ScriptExecutionLog struct {
	ID         uint      `json:"id" gorm:"primarykey"`
	CreatedAt  time.Time `json:"created_at"`
	ScriptID   uint      `json:"script_id" gorm:"column:script_id;index;not null"`
	ScriptName string    `json:"script_name" gorm:"column:script_name;type:varchar(255)"`
	ExecMode   string    `json:"exec_mode" gorm:"column:exec_mode;type:varchar(32)"`
	Params     string    `json:"params" gorm:"column:params;type:text"`
	Status     string    `json:"status" gorm:"column:status;type:varchar(32)"` // success, failed
	ExitCode   int       `json:"exit_code" gorm:"column:exit_code"`
	Output     string    `json:"output" gorm:"column:output;type:text"`
	DurationMs int64     `json:"duration_ms" gorm:"column:duration_ms"`
}

func (ScriptExecutionLog) TableName() string {
	return "script_execution_logs"
}

type ScriptRunReq struct {
	Params map[string]interface{} `json:"params"`
}
