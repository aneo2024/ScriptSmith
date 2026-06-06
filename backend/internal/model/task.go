package model

import "time"

// Task 小说转剧本的任务模型
type Task struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	UserID      string    `gorm:"index" json:"user_id,omitempty"`
	NovelText   string    `gorm:"type:text;not null" json:"novel_text"`
	Format      string    `gorm:"type:text" json:"format"`
	Style       string    `gorm:"type:text" json:"style"`
	ResultYAML  string    `gorm:"type:text" json:"result_yaml"`
	Status      string    `gorm:"type:text;not null;default:'pending'" json:"status"`
	Progress    float64   `gorm:"default:0" json:"progress"`
	ErrorMsg    string    `gorm:"type:text" json:"error_msg,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
