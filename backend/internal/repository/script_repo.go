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

func (r *ScriptRepository) Get(id string) (*model.Script, error) {
	var script model.Script
	err := r.db.First(&script, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &script, nil
}

func (r *ScriptRepository) GetByTaskID(taskID string) (*model.Script, error) {
	var script model.Script
	err := r.db.Where("task_id = ?", taskID).First(&script).Error
	if err != nil {
		return nil, err
	}
	return &script, nil
}

func (r *ScriptRepository) ListByWorkID(workID string) ([]model.Script, error) {
	var scripts []model.Script
	err := r.db.Where("work_id = ?", workID).Order("episode ASC").Find(&scripts).Error
	if err != nil {
		return nil, err
	}
	return scripts, nil
}

func (r *ScriptRepository) Update(script *model.Script) error {
	return r.db.Save(script).Error
}

func (r *ScriptRepository) Delete(id string) error {
	return r.db.Delete(&model.Script{}, "id = ?", id).Error
}
