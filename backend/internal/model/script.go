package model

import (
	"time"

	"gorm.io/datatypes"
)

// Script 剧本结构化存储
type Script struct {
	ID         string         `gorm:"primaryKey" json:"id"`
	TaskID     string         `gorm:"index" json:"task_id"`
	Metadata   datatypes.JSON `gorm:"type:json" json:"metadata"`     // {title, original_title, format, genre}
	Characters datatypes.JSON `gorm:"type:json" json:"characters"`   // [{id, name, type, description}]
	Scenes     datatypes.JSON `gorm:"type:json" json:"scenes"`       // [{id, sequence, slugline, content}]
	YAML       string         `gorm:"type:text" json:"yaml"`         // 实时生成的 YAML
	Version    int            `json:"version"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
}

// Slugline 场景标题行
type Slugline struct {
	Type string `json:"type"` // interior / exterior / both
	Name string `json:"name"` // 地点
	Time string `json:"time"` // day / night / dawn / dusk / continuous
}

// SceneContent 场景内的一个内容块（动作/对话/音效等）
type SceneContent struct {
	ID               string `json:"id"`
	Type             string `json:"type"` // action / dialogue / transition / sound / note
	Description      string `json:"description,omitempty"`       // action 用
	CharacterID      string `json:"character_id,omitempty"`      // dialogue 用
	CharacterName    string `json:"character_name,omitempty"`    // dialogue 用
	Text             string `json:"text,omitempty"`              // dialogue 用
	Emotion          string `json:"emotion,omitempty"`           // dialogue 用
	Parenthetical    string `json:"parenthetical,omitempty"`     // dialogue 用
	TransitionType   string `json:"transition_type,omitempty"`   // transition 用
	SoundType        string `json:"sound_type,omitempty"`        // sound 用
	SoundDescription string `json:"sound_description,omitempty"` // sound 用
	NoteType         string `json:"note_type,omitempty"`         // note 用
	NoteText         string `json:"note_text,omitempty"`         // note 用
}

// Scene 场景
type Scene struct {
	ID                string         `json:"id"`
	Sequence          int            `json:"sequence"`
	Title             string         `json:"title"`
	Slugline          Slugline       `json:"slugline"`
	Content           []SceneContent `json:"content"`
	CharactersPresent []string       `json:"characters_present"`
	Mood              string         `json:"mood"`
	Notes             string         `json:"notes"`
}

// Character 角色
type Character struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"` // protagonist / antagonist / supporting / extra
	Description string `json:"description"`
	Age         string `json:"age,omitempty"`
	Gender      string `json:"gender,omitempty"`
	Occupation  string `json:"occupation,omitempty"`
	Arc         string `json:"arc,omitempty"`
}

// Metadata 剧本元数据
type Metadata struct {
	Title         string `json:"title"`
	OriginalTitle string `json:"original_title"`
	Author        string `json:"author"`
	Adapter       string `json:"adapter"`
	Genre         string `json:"genre"`
	Format        string `json:"format"`
	Episodes      int    `json:"episodes,omitempty"`
}
