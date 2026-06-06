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
	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	_ "modernc.org/sqlite"
)

func main() {
	// 加载 .env 文件（从当前目录或上级目录查找）
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../../.env")

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "scriptsmith.db"
	}

	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", dbPath)
	db, err := gorm.Open(sqlite.Dialector{DSN: dsn, DriverName: "sqlite"}, &gorm.Config{})
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Task{}, &model.Script{}, &model.Work{}); err != nil {
		log.Fatalf("迁移表结构失败: %v", err)
	}
	log.Printf("数据库已就绪: %s", dbPath)

	aiClient := ai.NewClient()
	taskRepo := repository.NewTaskRepository(db)
	scriptRepo := repository.NewScriptRepository(db)
	userRepo := repository.NewUserRepository(db)
	workRepo := repository.NewWorkRepository(db)
	svc := service.NewScriptService(taskRepo, scriptRepo, aiClient)
	h := handler.NewScriptHandler(svc)
	authH := handler.NewAuthHandler(userRepo)
	workH := handler.NewWorkHandler(workRepo)

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

			// 结构化剧本 CRUD
			auth.GET("/scripts/by-task/:taskID", h.GetScriptByTaskID)
			auth.GET("/scripts/:scriptID", h.GetStructuredScript)
			auth.GET("/scripts/:scriptID/yaml", h.ExportYAML)
			auth.PUT("/scripts/:scriptID", h.SaveScript)
			auth.PUT("/scripts/:scriptID/scenes/:sceneID", h.UpdateScene)
			auth.PUT("/scripts/:scriptID/contents/:contentID", h.UpdateContent)

			// 作品 CRUD
			auth.POST("/works", workH.CreateWork)
			auth.GET("/works", workH.ListWorks)
			auth.GET("/works/count", workH.GetWorkCount)
			auth.GET("/works/:id", workH.GetWork)
			auth.PUT("/works/:id", workH.UpdateWork)
			auth.DELETE("/works/:id", workH.DeleteWork)
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
