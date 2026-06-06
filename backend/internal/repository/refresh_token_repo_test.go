package repository

import (
	"testing"
)

func TestGenerateRefreshToken(t *testing.T) {
	// 生成两次，应得到不同的值
	t1, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken() 失败: %v", err)
	}
	t2, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken() 失败: %v", err)
	}

	if t1 == t2 {
		t.Error("两次生成的 refresh token 不应相同")
	}

	// 验证是有效的 hex 字符串，长度应为 64（32 字节 × 2）
	if len(t1) != 64 {
		t.Errorf("refresh token 长度应为 64，实际为 %d", len(t1))
	}
	if len(t2) != 64 {
		t.Errorf("refresh token 长度应为 64，实际为 %d", len(t2))
	}
}

func TestHashToken(t *testing.T) {
	raw := "abc123test"
	h1 := hashToken(raw)
	h2 := hashToken(raw)

	// 相同输入应产生相同哈希
	if h1 != h2 {
		t.Error("hashToken 相同输入应产生相同哈希")
	}

	// 不同输入应产生不同哈希
	h3 := hashToken("different")
	if h1 == h3 {
		t.Error("hashToken 不同输入应产生不同哈希")
	}

	// 验证是有效 hex 字符串（SHA-256 = 64 hex chars）
	if len(h1) != 64 {
		t.Errorf("hash 长度应为 64，实际为 %d", len(h1))
	}
}

func TestHashTokenRoundTrip(t *testing.T) {
	// 模拟完整的生成→哈希→验证流程
	for i := 0; i < 10; i++ {
		raw, err := GenerateRefreshToken()
		if err != nil {
			t.Fatalf("GenerateRefreshToken() 失败: %v", err)
		}

		// 哈希后的 token 应与原始 token 验证匹配
		h := hashToken(raw)
		if h == raw {
			t.Error("哈希值不应与原始 token 相同")
		}

		// 稍微修改原始 token，哈希应不同
		modified := raw[:32] + "ffffffffffffffffffffffffffffffff"
		if hashToken(modified) == h {
			t.Error("修改后的 token 哈希不应与原始相同")
		}
	}
}
