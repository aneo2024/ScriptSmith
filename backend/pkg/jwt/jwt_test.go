package jwt

import (
	"os"
	"testing"
)

func TestGenerateAndParseToken(t *testing.T) {
	// 设置测试密钥
	os.Setenv("JWT_SECRET", "test-secret-for-unit-test")
	defer os.Unsetenv("JWT_SECRET")

	userID := "user-123"
	role := "user"

	token, err := GenerateToken(userID, role)
	if err != nil {
		t.Fatalf("GenerateToken() 失败: %v", err)
	}

	if token == "" {
		t.Fatal("生成的 token 不应为空")
	}

	// 解析 token
	claims, err := ParseToken(token)
	if err != nil {
		t.Fatalf("ParseToken() 失败: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID 应为 %s，实际为 %s", userID, claims.UserID)
	}
	if claims.Role != role {
		t.Errorf("Role 应为 %s，实际为 %s", role, claims.Role)
	}
}

func TestParseTokenInvalid(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret")
	defer os.Unsetenv("JWT_SECRET")

	// 无效 token
	_, err := ParseToken("not-a-valid-token")
	if err == nil {
		t.Error("无效 token 应返回错误")
	}

	// 空 token
	_, err = ParseToken("")
	if err == nil {
		t.Error("空 token 应返回错误")
	}

	// 用不同密钥签发的 token
	os.Setenv("JWT_SECRET", "secret-a")
	token, _ := GenerateToken("user-1", "user")

	os.Setenv("JWT_SECRET", "secret-b")
	_, err = ParseToken(token)
	if err == nil {
		t.Error("用不同密钥签发的 token 应返回错误")
	}
}

func TestGenerateTokenWithAdminRole(t *testing.T) {
	os.Setenv("JWT_SECRET", "admin-test-secret")
	defer os.Unsetenv("JWT_SECRET")

	token, err := GenerateToken("admin-1", "admin")
	if err != nil {
		t.Fatalf("GenerateToken() 失败: %v", err)
	}

	claims, err := ParseToken(token)
	if err != nil {
		t.Fatalf("ParseToken() 失败: %v", err)
	}

	if claims.Role != "admin" {
		t.Errorf("Role 应为 admin，实际为 %s", claims.Role)
	}
}

func TestDefaultDevSecret(t *testing.T) {
	// 确保没有设置环境变量
	os.Unsetenv("JWT_SECRET")

	secret := getSecret()
	if secret != defaultDevSecret {
		t.Errorf("未设置 JWT_SECRET 时应使用默认开发密钥")
	}

	token, err := GenerateToken("test-user", "user")
	if err != nil {
		t.Fatalf("GenerateToken() 失败: %v", err)
	}

	claims, err := ParseToken(token)
	if err != nil {
		t.Fatalf("ParseToken() 失败: %v", err)
	}

	if claims.UserID != "test-user" {
		t.Errorf("UserID 应为 test-user，实际为 %s", claims.UserID)
	}
}
