package model

import (
	"time"

	"gorm.io/datatypes"
)

type Work struct {
	ID              string         `gorm:"primaryKey" json:"id"`
	UserID          string         `gorm:"index" json:"user_id"`
	Title           string         `gorm:"type:text;not null" json:"title"`
	Summary         string         `gorm:"type:text" json:"summary"`
	Status          string         `gorm:"type:text;default:'draft'" json:"status"`
	Genre           string         `json:"genre"`
	MainChar        string         `json:"main_char"`
	SupportingChars datatypes.JSON `gorm:"type:json" json:"supporting_chars"`
	WordCount       int            `json:"word_count"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}