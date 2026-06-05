package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AdminOnly 管理员权限中间件，需在 AuthMiddleware 之后使用
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role")
		if role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "需要管理员权限"})
			c.Abort()
			return
		}
		c.Next()
	}
}
