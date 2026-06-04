package repository

import (
	"scriptsmith/internal/model"

	"gorm.io/gorm"
)

type ScriptRepository struct {
	db *gorm.DB
}

func NewScriptRepository(db *gorm.DB) *ScriptRepository {
	return &ScriptRepository{db: db}
}

func (r *ScriptRepository) Create(script *model.Script) error {
	return r.db.Create(script).Error
}

func (r *ScriptRepository) GetByTaskID(taskID string) (*model.Script, error) {
	var script model.Script
	err := r.db.Where("task_id = ?", taskID).First(&script).Error
	if err != nil {
		return nil, err
	}
	return &script, nil
}
