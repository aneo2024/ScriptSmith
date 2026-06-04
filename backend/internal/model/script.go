package model

import (
	"encoding/json"
	"time"
)

// Script 存储解析后的剧本结构化数据
type Script struct {
	ID         string          `gorm:"primaryKey" json:"id"`
	TaskID     string          `gorm:"uniqueIndex;not null" json:"task_id"`
	Metadata   json.RawMessage `gorm:"type:text;serializer:json" json:"metadata"`
	Characters json.RawMessage `gorm:"type:text;serializer:json" json:"characters"`
	Scenes     json.RawMessage `gorm:"type:text;serializer:json" json:"scenes"`
	YAML       string          `gorm:"type:text" json:"yaml"`
	CreatedAt  time.Time       `json:"created_at"`
}
