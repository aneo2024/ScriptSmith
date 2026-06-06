package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimitEntry struct {
	count    int
	windowStart time.Time
}

// RateLimit 基于 IP 的简单请求频率限制中间件
// maxRequests: 在每个时间窗口内允许的最大请求数
// window: 时间窗口
func RateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
	var mu sync.Mutex
	visitors := make(map[string]*rateLimitEntry)

	// 定期清理过期记录
	go func() {
		for {
			time.Sleep(window)
			mu.Lock()
			now := time.Now()
			for ip, entry := range visitors {
				if now.Sub(entry.windowStart) > window {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()

		mu.Lock()
		entry, exists := visitors[ip]
		now := time.Now()

		if !exists || now.Sub(entry.windowStart) > window {
			// 新窗口
			visitors[ip] = &rateLimitEntry{count: 1, windowStart: now}
			mu.Unlock()
			c.Next()
			return
		}

		entry.count++
		if entry.count > maxRequests {
			mu.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "请求过于频繁，请稍后再试",
			})
			c.Abort()
			return
		}
		mu.Unlock()

		c.Next()
	}
}
