package jwt

import (
	"fmt"
	"log"
	"os"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

const defaultDevSecret = "scriptsmith-dev-secret-do-not-use-in-production"

// getSecret 获取 JWT 密钥，开发环境未配置时使用默认值并警告
func getSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Println("[WARN] JWT_SECRET 未配置，使用默认开发密钥（生产环境请务必设置）")
		return defaultDevSecret
	}
	return secret
}

// Claims JWT 载荷
type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwtlib.RegisteredClaims
}

// GenerateToken 签发 JWT，有效期 72 小时
func GenerateToken(userID, role string) (string, error) {
	secret := getSecret()

	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwtlib.RegisteredClaims{
			ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwtlib.NewNumericDate(time.Now()),
		},
	}

	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseToken 解析并验证 JWT
func ParseToken(tokenString string) (*Claims, error) {
	secret := getSecret()

	token, err := jwtlib.ParseWithClaims(tokenString, &Claims{}, func(t *jwtlib.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwtlib.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("无效的 token")
	}

	return claims, nil
}
