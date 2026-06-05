package handler

import (
	"net/http"
	"regexp"
	"strings"
	"time"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"
	"scriptsmith/pkg/jwt"

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
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数不合法"})
		return
	}

	if msg := validateRegister(&req); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	// 检查用户名是否已存在
	if existing, _ := h.userRepo.GetByUsername(req.Username); existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "用户名已存在"})
		return
	}

	hash, err := repository.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	user := &model.User{
		Username:     strings.TrimSpace(req.Username),
		PasswordHash: hash,
		Email:        strings.TrimSpace(req.Email),
		Role:         "user",
	}

	if err := h.userRepo.CreateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建用户失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"user_id":  user.ID,
		"username": user.Username,
	})
}

// Login 用户登录
// POST /v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数不合法"})
		return
	}

	user, err := h.userRepo.GetByUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	if !repository.CheckPassword(user.PasswordHash, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	token, err := jwt.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成 token 失败"})
		return
	}

	// 生成刷新令牌（有效期 7 天）
	refreshToken, err := h.refreshTokenRepo.Create(user.ID, 7*24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成刷新令牌失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数不合法"})
		return
	}

	userID, err := h.refreshTokenRepo.ValidateAndConsume(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "刷新令牌无效或已过期"})
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在"})
		return
	}

	token, err := jwt.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成 token 失败"})
		return
	}

	refreshToken, err := h.refreshTokenRepo.Create(user.ID, 7*24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成刷新令牌失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":         token,
		"refresh_token": refreshToken,
		"expires_in":    86400,
		"user_id":       user.ID,
		"username":      user.Username,
		"role":          user.Role,
	})
}

// Me 获取当前用户信息
// GET /v1/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"role":     user.Role,
	})
}
