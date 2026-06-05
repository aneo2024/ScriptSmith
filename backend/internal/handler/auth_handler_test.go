package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// setupTestDB 创建内存数据库并迁移表结构
func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("无法连接测试数据库: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.RefreshToken{}); err != nil {
		t.Fatalf("迁移表结构失败: %v", err)
	}
	return db
}

// setupRouter 创建测试路由
func setupRouter(authH *AuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	v1 := r.Group("/v1")
	{
		v1.POST("/auth/register", authH.Register)
		v1.POST("/auth/login", authH.Login)
		v1.POST("/auth/refresh", authH.Refresh)
	}
	return r
}

// registerAndLogin 辅助函数：注册并登录，返回 access_token 和 refresh_token
func registerAndLogin(t *testing.T, r *gin.Engine) (accessToken, refreshToken string) {
	t.Helper()

	// 注册
	regBody, _ := json.Marshal(RegisterRequest{
		Username: "testuser",
		Password: "test123456",
		Email:    "test@example.com",
	})
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("注册失败: status=%d, body=%s", w.Code, w.Body.String())
	}

	// 登录
	loginBody, _ := json.Marshal(LoginRequest{
		Username: "testuser",
		Password: "test123456",
	})
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("登录失败: status=%d, body=%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	accessToken, _ = resp["token"].(string)
	refreshToken, _ = resp["refresh_token"].(string)

	if accessToken == "" {
		t.Fatal("登录响应缺少 access_token")
	}
	if refreshToken == "" {
		t.Fatal("登录响应缺少 refresh_token")
	}

	return
}

func TestLoginReturnsRefreshToken(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-jwt-secret")
	defer os.Unsetenv("JWT_SECRET")

	db := setupTestDB(t)
	userRepo := repository.NewUserRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	authH := NewAuthHandler(userRepo, refreshTokenRepo)
	r := setupRouter(authH)

	accessToken, refreshToken := registerAndLogin(t, r)

	// 验证 refresh_token 是 64 位 hex 字符串
	if len(refreshToken) != 64 {
		t.Errorf("refresh_token 长度应为 64，实际为 %d", len(refreshToken))
	}

	// 验证 access_token 不为空且与 refresh_token 不同
	if accessToken == refreshToken {
		t.Error("access_token 与 refresh_token 不应相同")
	}
}

func TestRefreshTokenEndpoint(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-jwt-secret")
	defer os.Unsetenv("JWT_SECRET")

	db := setupTestDB(t)
	userRepo := repository.NewUserRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	authH := NewAuthHandler(userRepo, refreshTokenRepo)
	r := setupRouter(authH)

	_, refreshToken := registerAndLogin(t, r)

	// 调用 refresh 接口
	refreshBody, _ := json.Marshal(map[string]string{
		"refresh_token": refreshToken,
	})
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", bytes.NewReader(refreshBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("refresh 失败: status=%d, body=%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	// 验证返回了新的 token 和 refresh_token
	newAccessToken, _ := resp["token"].(string)
	newRefreshToken, _ := resp["refresh_token"].(string)

	if newAccessToken == "" {
		t.Error("refresh 响应缺少 access_token")
	}
	if newRefreshToken == "" {
		t.Error("refresh 响应缺少 refresh_token")
	}
	if newAccessToken == "" && newRefreshToken == "" {
		t.Fatal("refresh 未返回有效的 token")
	}

	// 验证新旧 refresh_token 不同（轮换）
	if newRefreshToken == refreshToken {
		t.Error("refresh 轮换后应返回新的 refresh_token")
	}
}

func TestRefreshTokenReuseFails(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-jwt-secret")
	defer os.Unsetenv("JWT_SECRET")

	db := setupTestDB(t)
	userRepo := repository.NewUserRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	authH := NewAuthHandler(userRepo, refreshTokenRepo)
	r := setupRouter(authH)

	_, refreshToken := registerAndLogin(t, r)

	// 第一次 refresh 成功
	refreshBody, _ := json.Marshal(map[string]string{
		"refresh_token": refreshToken,
	})
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", bytes.NewReader(refreshBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("第一次 refresh 失败: status=%d, body=%s", w.Code, w.Body.String())
	}

	// 第二次使用同一个 refresh_token 应失败（一次性轮换）
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", bytes.NewReader(refreshBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("重复使用 refresh_token 应返回 401，实际返回 %d", w.Code)
	}
}

func TestRefreshTokenInvalid(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-jwt-secret")
	defer os.Unsetenv("JWT_SECRET")

	db := setupTestDB(t)
	userRepo := repository.NewUserRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	authH := NewAuthHandler(userRepo, refreshTokenRepo)
	r := setupRouter(authH)

	// 使用无效的 refresh_token
	refreshBody, _ := json.Marshal(map[string]string{
		"refresh_token": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
	})
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", bytes.NewReader(refreshBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("无效 refresh_token 应返回 401，实际返回 %d", w.Code)
	}
}

func TestRefreshTokenMissingField(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-jwt-secret")
	defer os.Unsetenv("JWT_SECRET")

	db := setupTestDB(t)
	userRepo := repository.NewUserRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	authH := NewAuthHandler(userRepo, refreshTokenRepo)
	r := setupRouter(authH)

	// 缺少 refresh_token 字段
	refreshBody, _ := json.Marshal(map[string]string{})
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", bytes.NewReader(refreshBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("缺少 refresh_token 应返回 400，实际返回 %d", w.Code)
	}
}

func TestRegisterDuplicateUsername(t *testing.T) {
	db := setupTestDB(t)
	userRepo := repository.NewUserRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	authH := NewAuthHandler(userRepo, refreshTokenRepo)
	r := setupRouter(authH)

	// 第一次注册
	regBody, _ := json.Marshal(RegisterRequest{
		Username: "dupuser",
		Password: "test123456",
	})
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("第一次注册失败: status=%d", w.Code)
	}

	// 第二次注册同一用户名
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("重复注册应返回 409，实际返回 %d", w.Code)
	}
}
