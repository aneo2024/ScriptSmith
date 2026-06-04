package repository

import (
	"scriptsmith/internal/model"

	"gorm.io/gorm"
)

type TaskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) Create(task *model.Task) error {
	return r.db.Create(task).Error
}

func (r *TaskRepository) GetByID(id string) (*model.Task, error) {
	var task model.Task
	err := r.db.First(&task, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *TaskRepository) List() ([]*model.Task, error) {
	var tasks []*model.Task
	err := r.db.Order("created_at DESC").Find(&tasks).Error
	return tasks, err
}

func (r *TaskRepository) UpdateStatus(id string, status string, progress float64, yaml string, errMsg string) error {
	updates := map[string]interface{}{
		"status":      status,
		"progress":    progress,
		"result_yaml": yaml,
		"error_msg":   errMsg,
	}
	return r.db.Model(&model.Task{}).Where("id = ?", id).Updates(updates).Error
}
