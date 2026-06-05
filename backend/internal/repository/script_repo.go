package repository

import (
	"scriptsmith/internal/model"

	"gorm.io/gorm"
)

// ScriptRepository 剧本数据访问接口
type ScriptRepository interface {
	Create(script *model.Script) error
	Get(id string) (*model.Script, error)
	GetByTaskID(taskID string) (*model.Script, error)
	Update(script *model.Script) error
	Delete(id string) error
}

type scriptRepository struct {
	db *gorm.DB
}

func NewScriptRepository(db *gorm.DB) ScriptRepository {
	return &scriptRepository{db: db}
}

func (r *scriptRepository) Create(script *model.Script) error {
	return r.db.Create(script).Error
}

func (r *scriptRepository) Get(id string) (*model.Script, error) {
	var script model.Script
	err := r.db.First(&script, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &script, nil
}

func (r *scriptRepository) GetByTaskID(taskID string) (*model.Script, error) {
	var script model.Script
	err := r.db.Where("task_id = ?", taskID).First(&script).Error
	if err != nil {
		return nil, err
	}
	return &script, nil
}

func (r *scriptRepository) Update(script *model.Script) error {
	return r.db.Save(script).Error
}

func (r *scriptRepository) Delete(id string) error {
	return r.db.Delete(&model.Script{}, "id = ?", id).Error
}
