package main

import (
	"fmt"
	"log"
	"os"
	"scriptsmith/internal/ai"
	"scriptsmith/internal/handler"
	"scriptsmith/internal/middleware"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"
	"scriptsmith/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// 加载 .env 文件（从当前目录或上级目录查找）
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../../.env")

	dbType := os.Getenv("DB_TYPE")
	if dbType == "" {
		dbType = "sqlite" // 默认用 SQLite 开发
	}

	var db *gorm.DB
	var err error

	switch dbType {
	case "postgres":
		dsn := os.Getenv("DB_DSN")
		if dsn == "" {
			dsn = "postgres://postgres:postgres@localhost:5432/scriptsmith?sslmode=disable"
		}
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	default:
		// SQLite
		dbPath := os.Getenv("DB_PATH")
		if dbPath == "" {
			dbPath = "scriptsmith.db"
		}
		dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", dbPath)
		db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	}

	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Task{}, &model.Script{}, &model.Work{}, &model.RefreshToken{}, &model.Article{}, &model.Topic{}, &model.AIProvider{}); err != nil {
		log.Fatalf("迁移表结构失败: %v", err)
	}
	log.Printf("数据库已就绪 (type=%s)", dbType)

	aiClient := ai.NewClient()
	taskRepo := repository.NewTaskRepository(db)
	scriptRepo := repository.NewScriptRepository(db)
	userRepo := repository.NewUserRepository(db)
	workRepo := repository.NewWorkRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	articleRepo := repository.NewArticleRepository(db)
	providerRepo := repository.NewAIProviderRepository(db)
	svc := service.NewScriptService(taskRepo, scriptRepo, workRepo, providerRepo, aiClient)
	h := handler.NewScriptHandler(svc)
	authH := handler.NewAuthHandler(userRepo, refreshTokenRepo)
	workH := handler.NewWorkHandler(workRepo, scriptRepo, taskRepo, providerRepo, aiClient)
	inspirationH := handler.NewInspirationHandler(articleRepo, aiClient)
	aiProviderH := handler.NewAIProviderHandler(providerRepo, aiClient)

	r := gin.Default()

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
		// 公开路由：无需认证
		v1.GET("/health", h.HealthCheck)
		v1.POST("/auth/register", authH.Register)
		v1.POST("/auth/login", authH.Login)
		v1.POST("/auth/refresh", authH.Refresh)
		v1.GET("/auth/me", middleware.AuthMiddleware(), authH.Me)

		// 需要认证的路由
		auth := v1.Group("")
		auth.Use(middleware.AuthMiddleware())
		{
			auth.POST("/auth/logout", authH.Logout)
			auth.POST("/convert", h.Convert)
			auth.GET("/task/:id", h.GetTask)
			auth.GET("/script/:id", h.GetScript)
			auth.GET("/script/:id/characters", h.GetCharacters)
			auth.GET("/script/:id/scenes", h.GetScenes)

			// 结构化剧本 CRUD
			auth.GET("/scripts/by-task/:taskID", h.GetScriptByTaskID)
			auth.GET("/scripts/:scriptID", h.GetStructuredScript)
			auth.GET("/scripts/:scriptID/yaml", h.ExportYAML)
			auth.PUT("/scripts/:scriptID", h.SaveScript)
			auth.POST("/scripts/:scriptID/summary", h.GenerateSummary)
			auth.POST("/scripts/:scriptID/characters/appearance", h.GenerateCharacterAppearances)
			auth.POST("/scripts/:scriptID/scenes/environment", h.GenerateSceneEnvironments)
			auth.PUT("/scripts/:scriptID/scenes/:sceneID", h.UpdateScene)
			auth.PUT("/scripts/:scriptID/contents/:contentID", h.UpdateContent)
			auth.POST("/scripts/:scriptID/scenes/:sceneID/contents", h.AddContent)
			auth.DELETE("/scripts/:scriptID/contents/:contentID", h.DeleteContent)

			// 作品 CRUD
			auth.POST("/works", workH.CreateWork)
			auth.GET("/works", workH.ListWorks)
			auth.GET("/works/stats", workH.GetStats)
			auth.GET("/works/count", workH.GetWorkCount)
			auth.GET("/works/:id", workH.GetWork)
			auth.PUT("/works/:id", workH.UpdateWork)
			auth.DELETE("/works/:id", workH.DeleteWork)

			// 作品级 AI 角色设定（长相/年龄/性格/背景 — 全作品共享）
			auth.POST("/works/:id/characters/profiles", workH.GenerateCharacterProfiles)

			// 作品下的剧本列表
			auth.GET("/works/:id/scripts", h.ListWorkScripts)

			// 灵感文章 & 话题
			auth.POST("/inspiration/articles", inspirationH.CreateArticle)
			auth.GET("/inspiration/articles", inspirationH.ListArticles)
			auth.GET("/inspiration/articles/:id", inspirationH.GetArticle)
			auth.POST("/inspiration/articles/:id/like", inspirationH.LikeArticle)
			auth.POST("/inspiration/generate", inspirationH.GenerateArticle)
			auth.GET("/inspiration/topics", inspirationH.ListTopics)
			auth.GET("/inspiration/topics/today", inspirationH.ListTodayTopics)
			auth.POST("/inspiration/topics", inspirationH.CreateTopic)

			// AI provider 管理（用户自定义大模型）
			auth.POST("/ai/providers", aiProviderH.Create)
			auth.GET("/ai/providers", aiProviderH.List)
			auth.PUT("/ai/providers/:id", aiProviderH.Update)
			auth.DELETE("/ai/providers/:id", aiProviderH.Delete)
			auth.PUT("/ai/providers/:id/default", aiProviderH.SetDefault)
			auth.POST("/ai/providers/:id/test", aiProviderH.Test)
		}

		// 管理路由：需要认证 + 管理员权限
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
		{
			admin.GET("/tasks", h.AdminListTasks)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("服务启动在 :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("启动服务失败: %v", err)
	}
}
