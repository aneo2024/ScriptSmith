package database

import (
	"scriptsmith/internal/model"

	"gorm.io/gorm"
)

// Migrate 自动迁移所有模型，创建/更新数据库表结构
func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.User{},
		&model.Task{},
		&model.Script{},
	)
}
