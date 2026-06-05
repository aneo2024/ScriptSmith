package model

import (
	"time"

	"gorm.io/datatypes"
)

// CharacterProfile 人物小传
type CharacterProfile struct {
	Name       string `json:"name"`
	Age        string `json:"age,omitempty"`
	Gender     string `json:"gender,omitempty"`
	Personality string `json:"personality,omitempty"`
	AvatarURL  string `json:"avatar_url,omitempty"`
}

type Work struct {
	ID                string         `gorm:"primaryKey" json:"id"`
	UserID            string         `gorm:"index" json:"user_id"`
	Title             string         `gorm:"type:text;not null" json:"title"`
	Synopsis          string         `gorm:"type:text" json:"synopsis"`       // 一句话梗概
	Summary           string         `gorm:"type:text" json:"summary"`        // 剧情简介
	CoverImage        string         `gorm:"type:text" json:"cover_image"`    // 封面图 URL/path
	Status            string         `gorm:"type:text;default:'draft'" json:"status"`
	Genre             string         `json:"genre"`
	MainChar          string         `json:"main_char"`
	CharacterProfiles datatypes.JSON `gorm:"type:json" json:"character_profiles"` // [{name, age, gender, personality, avatar_url}]
	SupportingChars   datatypes.JSON `gorm:"type:json" json:"supporting_chars"`
	WordCount         int            `json:"word_count"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}
