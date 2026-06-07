package repository

import (
	"fmt"
	"scriptsmith/internal/model"

	"gorm.io/gorm"
)

type AIProviderRepository struct {
	db *gorm.DB
}

func NewAIProviderRepository(db *gorm.DB) *AIProviderRepository {
	return &AIProviderRepository{db: db}
}

// Create 新建一个 provider；如果 IsDefault=true 则自动把该用户其他 provider 的默认状态清零
func (r *AIProviderRepository) Create(p *model.AIProvider) error {
	tx := r.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if p.IsDefault {
		if err := tx.Model(&model.AIProvider{}).
			Where("user_id = ?", p.UserID).
			Update("is_default", false).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("重置默认 provider 失败: %w", err)
		}
	}
	if err := tx.Create(p).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

// ListByUser 获取某个用户的所有 provider（按默认优先、创建时间倒序）
func (r *AIProviderRepository) ListByUser(userID string) ([]*model.AIProvider, error) {
	var providers []*model.AIProvider
	if err := r.db.Where("user_id = ?", userID).
		Order("is_default DESC, created_at DESC").
		Find(&providers).Error; err != nil {
		return nil, err
	}
	return providers, nil
}

// GetByID 按 ID 读取（必须是当前用户的）
func (r *AIProviderRepository) GetByID(id, userID string) (*model.AIProvider, error) {
	var p model.AIProvider
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).
		First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

// GetDefault 获取用户的默认 provider；若没有，则返回 nil（无错误）
func (r *AIProviderRepository) GetDefault(userID string) (*model.AIProvider, error) {
	var p model.AIProvider
	if err := r.db.Where("user_id = ?", userID).
		Order("is_default DESC, created_at DESC").
		First(&p).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

// Update 更新 provider 基本信息（name/base_url/model/max_tokens/is_default）
// 不包含 API key 字段的更新（专门的 UpdateAPIKey 方法）
func (r *AIProviderRepository) Update(id, userID string, p *model.AIProvider) error {
	tx := r.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if p.IsDefault {
		if err := tx.Model(&model.AIProvider{}).
			Where("user_id = ?", userID).
			Update("is_default", false).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("重置默认 provider 失败: %w", err)
		}
	}

	result := tx.Model(&model.AIProvider{}).
		Where("id = ? AND user_id = ?", id, userID).
		Updates(map[string]interface{}{
			"name":       p.Name,
			"provider":   p.Provider,
			"base_url":   p.BaseURL,
			"model":      p.Model,
			"max_tokens": p.MaxTokens,
			"is_default": p.IsDefault,
		})
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("provider 不存在或无权修改")
	}
	return tx.Commit().Error
}

// UpdateAPIKey 单独更新 API key
func (r *AIProviderRepository) UpdateAPIKey(id, userID, apiKey string) error {
	result := r.db.Model(&model.AIProvider{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("api_key", apiKey)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("provider 不存在或无权修改")
	}
	return nil
}

// Delete 删除一个 provider（必须属于该用户）
func (r *AIProviderRepository) Delete(id, userID string) error {
	result := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.AIProvider{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("provider 不存在或无权删除")
	}
	return nil
}

// SetDefault 把指定 provider 设为默认，同时把该用户其他 provider 的默认标志置为 false
func (r *AIProviderRepository) SetDefault(id, userID string) error {
	tx := r.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Model(&model.AIProvider{}).
		Where("user_id = ?", userID).
		Update("is_default", false).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("重置默认 provider 失败: %w", err)
	}

	result := tx.Model(&model.AIProvider{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_default", true)
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("provider 不存在或无权修改")
	}
	return tx.Commit().Error
}
