package main

import (
	"scriptsmith/internal/handler"
	"scriptsmith/internal/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRoutes 注册所有路由
func SetupRoutes(
	r *gin.Engine,
	h *handler.ScriptHandler,
	authH *handler.AuthHandler,
) {
	// CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	v1 := r.Group("/v1")
	{
		// 公开路由
		v1.GET("/health", h.HealthCheck)
		v1.POST("/auth/register", authH.Register)
		v1.POST("/auth/login", authH.Login)
		v1.GET("/auth/me", middleware.AuthMiddleware(), authH.Me)

		// 需要认证的路由
		auth := v1.Group("")
		auth.Use(middleware.AuthMiddleware())
		{
			auth.POST("/convert", h.Convert)
			auth.GET("/task/:id", h.GetTask)
			auth.GET("/script/:id", h.GetScript)
			auth.GET("/script/:id/characters", h.GetCharacters)
			auth.GET("/script/:id/scenes", h.GetScenes)

			// 结构化剧本细粒度编辑 API
			auth.GET("/scripts/:id", h.GetScriptByParam)
			auth.PUT("/scripts/:scriptID/scenes/:sceneID", h.UpdateScene)
			auth.PUT("/scripts/:scriptID/contents/:contentID", h.UpdateContent)
			auth.POST("/scripts/:scriptID/scenes/:sceneID/contents", h.AddContent)
			auth.DELETE("/scripts/:scriptID/contents/:contentID", h.DeleteContent)
		}

		// 管理路由
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
		{
			admin.GET("/tasks", h.AdminListTasks)
		}
	}
}
