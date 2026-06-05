package handler

import (
	"regexp"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"
	"scriptsmith/pkg/jwt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	userRepo         *repository.UserRepository
	refreshTokenRepo *repository.RefreshTokenRepository
}

func NewAuthHandler(userRepo *repository.UserRepository, refreshTokenRepo *repository.RefreshTokenRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, refreshTokenRepo: refreshTokenRepo}
}

var (
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,20}$`)
	emailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
)

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Email    string `json:"email"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func validateRegister(req *RegisterRequest) string {
	if len(req.Username) < 3 || len(req.Username) > 20 {
		return "用户名长度需为 3-20 个字符"
	}
	if !usernameRegex.MatchString(req.Username) {
		return "用户名只能包含字母、数字和下划线"
	}
	if len(req.Password) < 6 {
		return "密码至少需要 6 位"
	}
	if req.Email != "" && !emailRegex.MatchString(req.Email) {
		return "邮箱格式不正确"
	}
	return ""
}

// Register 用户注册
// POST /v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorBadRequest(c, "参数不合法")
		return
	}

	if msg := validateRegister(&req); msg != "" {
		ErrorBadRequest(c, msg)
		return
	}

	// 检查用户名是否已存在
	if existing, _ := h.userRepo.GetByUsername(req.Username); existing != nil {
		ErrorConflict(c, "用户名已存在")
		return
	}

	hash, err := repository.HashPassword(req.Password)
	if err != nil {
		ErrorInternal(c, "密码加密失败")
		return
	}

	user := &model.User{
		Username:     strings.TrimSpace(req.Username),
		PasswordHash: hash,
		Email:        strings.TrimSpace(req.Email),
		Role:         "user",
	}

	if err := h.userRepo.CreateUser(user); err != nil {
		ErrorInternal(c, "创建用户失败")
		return
	}

	Created(c, gin.H{
		"user_id":  user.ID,
		"username": user.Username,
	})
}

// Login 用户登录
// POST /v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorBadRequest(c, "参数不合法")
		return
	}

	user, err := h.userRepo.GetByUsername(req.Username)
	if err != nil {
		ErrorUnauthorized(c, "用户名或密码错误")
		return
	}

	if !repository.CheckPassword(user.PasswordHash, req.Password) {
		ErrorUnauthorized(c, "用户名或密码错误")
		return
	}

	token, err := jwt.GenerateToken(user.ID, user.Role)
	if err != nil {
		ErrorInternal(c, "生成 token 失败")
		return
	}

	// 生成刷新令牌（有效期 7 天）
	refreshToken, err := h.refreshTokenRepo.Create(user.ID, 7*24*time.Hour)
	if err != nil {
		ErrorInternal(c, "生成刷新令牌失败")
		return
	}

	OK(c, gin.H{
		"token":         token,
		"refresh_token": refreshToken,
		"expires_in":    86400,
		"user_id":       user.ID,
		"username":      user.Username,
		"role":          user.Role,
	})
}

// Refresh 刷新令牌 — 使用有效的 refresh_token 换发新的 access_token 和 refresh_token（轮换）
// POST /v1/auth/refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorBadRequest(c, "参数不合法")
		return
	}

	userID, err := h.refreshTokenRepo.ValidateAndConsume(req.RefreshToken)
	if err != nil {
		ErrorUnauthorized(c, "刷新令牌无效或已过期")
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		ErrorUnauthorized(c, "用户不存在")
		return
	}

	token, err := jwt.GenerateToken(user.ID, user.Role)
	if err != nil {
		ErrorInternal(c, "生成 token 失败")
		return
	}

	refreshToken, err := h.refreshTokenRepo.Create(user.ID, 7*24*time.Hour)
	if err != nil {
		ErrorInternal(c, "生成刷新令牌失败")
		return
	}

	OK(c, gin.H{
		"token":         token,
		"refresh_token": refreshToken,
		"expires_in":    86400,
		"user_id":       user.ID,
		"username":      user.Username,
		"role":          user.Role,
	})
}

// Logout 登出 — 撤销指定的刷新令牌
// POST /v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	userID := c.GetString("userID")

	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	// 允许不传 refresh_token（仅清除所有）
	if err := c.ShouldBindJSON(&req); err == nil && req.RefreshToken != "" {
		// 尝试消耗单条 token
		_, _ = h.refreshTokenRepo.ValidateAndConsume(req.RefreshToken)
	}

	// 撤销该用户所有 refresh token
	_ = h.refreshTokenRepo.RevokeByUserID(userID)

	OK(c, gin.H{"status": "ok"})
}

// Me 获取当前用户信息
// GET /v1/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		ErrorUnauthorized(c, "未认证")
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		ErrorNotFound(c, "用户不存在")
		return
	}

	OK(c, gin.H{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"role":     user.Role,
	})
}
