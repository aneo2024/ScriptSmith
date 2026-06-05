package main

import (
	"fmt"
	"log"
	"os"
	"scriptsmith/internal/ai"
	"scriptsmith/internal/database"
	"scriptsmith/internal/handler"
	"scriptsmith/internal/repository"
	"scriptsmith/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	_ "modernc.org/sqlite"
)

func main() {
	// 加载 .env 文件
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
	if err := database.Migrate(db); err != nil {
		log.Fatalf("迁移表结构失败: %v", err)
	}
	log.Printf("数据库已就绪: %s", dbPath)

	aiClient := ai.NewClient()
	taskRepo := repository.NewTaskRepository(db)
	scriptRepo := repository.NewScriptRepository(db)
	userRepo := repository.NewUserRepository(db)
	svc := service.NewScriptService(taskRepo, scriptRepo, aiClient)
	h := handler.NewScriptHandler(svc)
	authH := handler.NewAuthHandler(userRepo)

	r := gin.Default()
	SetupRoutes(r, h, authH)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("服务启动在 :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("启动服务失败: %v", err)
	}
}
