package repository

import (
	"scriptsmith/internal/model"

	"gorm.io/gorm"
)

type WorkRepository struct {
	db *gorm.DB
}

func NewWorkRepository(db *gorm.DB) *WorkRepository {
	return &WorkRepository{db: db}
}

func (r *WorkRepository) Create(work *model.Work) error {
	return r.db.Create(work).Error
}

func (r *WorkRepository) Get(id string) (*model.Work, error) {
	var work model.Work
	err := r.db.First(&work, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &work, nil
}

func (r *WorkRepository) ListByUserID(userID string) ([]model.Work, error) {
	var works []model.Work
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&works).Error
	if err != nil {
		return nil, err
	}
	return works, nil
}

func (r *WorkRepository) Update(work *model.Work) error {
	return r.db.Save(work).Error
}

func (r *WorkRepository) Delete(id string) error {
	return r.db.Delete(&model.Work{}, "id = ?", id).Error
}

func (r *WorkRepository) CountByUserID(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.Work{}).Where("user_id = ?", userID).Count(&count).Error
	if err != nil {
		return 0, err
	}
	return count, nil
}