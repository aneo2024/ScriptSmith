package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AIProvider 用户自定义的大模型配置。每个用户可以配置多个，其中一个可设为默认。
type AIProvider struct {
	ID         string    `gorm:"primaryKey" json:"id"`
	UserID     string    `gorm:"index;not null" json:"user_id"`
	Name       string    `gorm:"not null" json:"name"`       // 显示名，如"我的 DeepSeek"
	Provider   string    `gorm:"not null" json:"provider"`   // 厂商：deepseek/openai/custom
	BaseURL    string    `gorm:"not null" json:"base_url"`   // API 地址，默认 https://api.deepseek.com/v1
	Model      string    `gorm:"not null" json:"model"`      // 模型名：deepseek-chat / gpt-4o 等
	APIKey     string    `gorm:"not null" json:"api_key"`    // 明文存储在 sqlite/postgres，建议仅个人本地使用
	MaxTokens  int       `gorm:"default:32000" json:"max_tokens"`
	IsDefault  bool      `gorm:"default:false" json:"is_default"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (p *AIProvider) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}
