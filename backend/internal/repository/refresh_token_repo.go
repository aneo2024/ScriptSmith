package repository

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"scriptsmith/internal/model"
	"time"

	"gorm.io/gorm"
)

type RefreshTokenRepository struct {
	db *gorm.DB
}

func NewRefreshTokenRepository(db *gorm.DB) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

const refreshTokenBytes = 32

// GenerateRefreshToken 生成随机刷新令牌原始值（明文，返回给客户端）
func GenerateRefreshToken() (string, error) {
	b := make([]byte, refreshTokenBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// hashToken 对令牌明文做 SHA-256 哈希
func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

// Create 创建刷新令牌记录（存储哈希），返回原始令牌明文
func (r *RefreshTokenRepository) Create(userID string, ttl time.Duration) (string, error) {
	raw, err := GenerateRefreshToken()
	if err != nil {
		return "", err
	}

	record := &model.RefreshToken{
		UserID:    userID,
		TokenHash: hashToken(raw),
		ExpiresAt: time.Now().Add(ttl),
	}

	if err := r.db.Create(record).Error; err != nil {
		return "", err
	}

	return raw, nil
}

// ValidateAndConsume 验证刷新令牌并删除（一次性使用，防重放）
// 返回关联的 userID，验证失败返回空字符串
func (r *RefreshTokenRepository) ValidateAndConsume(raw string) (string, error) {
	h := hashToken(raw)

	var record model.RefreshToken
	if err := r.db.Where("token_hash = ? AND expires_at > ?", h, time.Now()).First(&record).Error; err != nil {
		return "", err
	}

	// 删除已使用的令牌（一次性轮换）
	if err := r.db.Delete(&record).Error; err != nil {
		return "", err
	}

	return record.UserID, nil
}

// RevokeByUserID 撤销某用户的所有刷新令牌（登出等场景）
func (r *RefreshTokenRepository) RevokeByUserID(userID string) error {
	return r.db.Where("user_id = ?", userID).Delete(&model.RefreshToken{}).Error
}
