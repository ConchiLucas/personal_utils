package model

import "time"

type AgileRequestLog struct {
	ID              uint      `json:"id" gorm:"primarykey"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	Method          string    `json:"method" gorm:"column:method;type:varchar(16);index"`
	URL             string    `json:"url" gorm:"column:url;type:text"`
	RequestHeaders  string    `json:"request_headers" gorm:"column:request_headers;type:text"`
	RequestBody     string    `json:"request_body" gorm:"column:request_body;type:text"`
	ResponseStatus  int       `json:"response_status" gorm:"column:response_status;type:int"`
	ResponseHeaders string    `json:"response_headers" gorm:"column:response_headers;type:text"`
	ResponseBody    string    `json:"response_body" gorm:"column:response_body;type:text"`
	DurationMs      int64     `json:"duration_ms" gorm:"column:duration_ms;type:bigint"`
	IsSuccess       int       `json:"is_success" gorm:"column:is_success;type:int;default:0"`
	ErrorMessage    string    `json:"error_message" gorm:"column:error_message;type:text"`
}

func (AgileRequestLog) TableName() string {
	return "agile_request_logs"
}

type AgileRequestSendReq struct {
	Method         string `json:"method"`
	URL            string `json:"url"`
	RequestHeaders string `json:"request_headers"`
	RequestBody    string `json:"request_body"`
}

type AgileRequestSearchReq struct {
	Page      int    `form:"page,default=1"`
	PageSize  int    `form:"page_size,default=50"`
	Method    string `form:"method"`
	Keyword   string `form:"keyword"`
	IsSuccess *int   `form:"is_success"`
}
