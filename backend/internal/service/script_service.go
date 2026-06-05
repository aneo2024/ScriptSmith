package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"scriptsmith/internal/ai"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"

	"github.com/google/uuid"
	"gopkg.in/yaml.v3"
)

type ScriptService struct {
	taskRepo   *repository.TaskRepository
	scriptRepo *repository.ScriptRepository
	aiClient   *ai.Client
}

func NewScriptService(
	taskRepo *repository.TaskRepository,
	scriptRepo *repository.ScriptRepository,
	aiClient *ai.Client,
) *ScriptService {
	return &ScriptService{taskRepo: taskRepo, scriptRepo: scriptRepo, aiClient: aiClient}
}

// ConvertNovel 创建任务（pending）并立即返回 task_id；启动 goroutine 后台调 AI。
func (s *ScriptService) ConvertNovel(novelText, format, style, userID string) (*model.Task, error) {
	if novelText == "" {
		return nil, fmt.Errorf("novel_text 不能为空")
	}
	if format == "" {
		format = "film"
	}
	if style == "" {
		style = "realistic"
	}

	task := &model.Task{
		ID:        uuid.New().String(),
		UserID:    userID,
		NovelText: novelText,
		Format:    format,
		Style:     style,
		Status:    "pending",
		Progress:  0,
	}
	if err := s.taskRepo.Create(task); err != nil {
		return nil, fmt.Errorf("创建任务失败: %w", err)
	}

	// 异步 goroutine 调 AI，避免阻塞 HTTP 请求
	go s.processInBackground(context.Background(), task.ID)

	return task, nil
}

// GetTask 查询任务状态，admin 可查任意，普通用户只能查自己的
func (s *ScriptService) GetTask(id, userID, role string) (*model.Task, error) {
	var task *model.Task
	var err error
	if role == "admin" {
		task, err = s.taskRepo.GetByID(id)
	} else {
		task, err = s.taskRepo.GetByIDAndUser(id, userID)
	}
	if err != nil {
		return nil, fmt.Errorf("任务不存在: %w", err)
	}
	return task, nil
}

// GetScript 获取转换完成的 YAML 剧本
func (s *ScriptService) GetScript(id, userID, role string) (string, error) {
	task, err := s.GetTask(id, userID, role)
	if err != nil {
		return "", err
	}
	if task.Status == "pending" || task.Status == "processing" {
		return "", fmt.Errorf("任务尚未完成,当前状态: %s", task.Status)
	}
	if task.Status == "failed" {
		return "", fmt.Errorf("任务失败: %s", task.ErrorMsg)
	}
	if task.ResultYAML == "" {
		return "", fmt.Errorf("剧本内容为空")
	}
	return task.ResultYAML, nil
}

// GetCharacters 获取角色列表
func (s *ScriptService) GetCharacters(taskID, userID, role string) (json.RawMessage, error) {
	// 先校验任务归属
	if _, err := s.GetTask(taskID, userID, role); err != nil {
		return nil, err
	}
	script, err := s.scriptRepo.GetByTaskID(taskID)
	if err != nil {
		return nil, fmt.Errorf("剧本数据不存在: %w", err)
	}
	if len(script.Characters) == 0 || string(script.Characters) == "null" {
		return json.RawMessage("[]"), nil
	}
	return json.RawMessage(script.Characters), nil
}

// GetScenes 获取场景列表
func (s *ScriptService) GetScenes(taskID, userID, role string) (json.RawMessage, error) {
	// 先校验任务归属
	if _, err := s.GetTask(taskID, userID, role); err != nil {
		return nil, err
	}
	script, err := s.scriptRepo.GetByTaskID(taskID)
	if err != nil {
		return nil, fmt.Errorf("剧本数据不存在: %w", err)
	}
	if len(script.Scenes) == 0 || string(script.Scenes) == "null" {
		return json.RawMessage("[]"), nil
	}
	return json.RawMessage(script.Scenes), nil
}

// ListAllTasks 获取所有任务（管理后台用）
func (s *ScriptService) ListAllTasks() ([]*model.Task, error) {
	return s.taskRepo.ListAll()
}

// ListTasksByUser 获取用户的任务列表
func (s *ScriptService) ListTasksByUser(userID string) ([]*model.Task, error) {
	return s.taskRepo.ListByUser(userID)
}

// processInBackground 后台处理：processing → 调 AI → 解析 YAML 存 Script → completed/failed
func (s *ScriptService) processInBackground(ctx context.Context, taskID string) {
	defer func() {
		if r := recover(); r != nil {
			_ = s.taskRepo.UpdateStatus(taskID, "failed", 0, "", fmt.Sprintf("后台处理异常: %v", r))
			log.Printf("[task %s] panic recovered: %v", taskID, r)
		}
	}()

	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		log.Printf("[task %s] 读取任务失败: %v", taskID, err)
		return
	}

	// 标记为 processing，进度 0.2
	if err := s.taskRepo.UpdateStatus(taskID, "processing", 0.2, "", ""); err != nil {
		log.Printf("[task %s] 更新 processing 状态失败: %v", taskID, err)
		return
	}

	// 调 AI
	yamlStr, err := s.aiClient.ConvertNovel(task.NovelText, task.Format, task.Style)
	if err != nil {
		_ = s.taskRepo.UpdateStatus(taskID, "failed", 0, "", err.Error())
		log.Printf("[task %s] AI 转换失败: %v", taskID, err)
		return
	}

	// 解析 YAML 提取结构化数据存入 Script 表
	if err := s.saveScript(taskID, yamlStr); err != nil {
		log.Printf("[task %s] 解析 YAML 存入 Script 失败（不影响任务完成）: %v", taskID, err)
	}

	// 更新 Task 为 completed
	if err := s.taskRepo.UpdateStatus(taskID, "completed", 1.0, yamlStr, ""); err != nil {
		log.Printf("[task %s] 更新 completed 状态失败: %v", taskID, err)
		return
	}
	log.Printf("[task %s] 转换完成", taskID)
}

// saveScript 解析 YAML 并存入 Script 表
func (s *ScriptService) saveScript(taskID, yamlStr string) error {
	// 解析 YAML
	var parsed struct {
		Script struct {
			Metadata   interface{} `yaml:"metadata"`
			Characters interface{} `yaml:"characters"`
			Scenes     interface{} `yaml:"scenes"`
		} `yaml:"script"`
	}
	if err := yaml.Unmarshal([]byte(yamlStr), &parsed); err != nil {
		return fmt.Errorf("YAML 解析失败: %w", err)
	}

	metadataJSON, _ := json.Marshal(parsed.Script.Metadata)
	charactersJSON, _ := json.Marshal(parsed.Script.Characters)
	scenesJSON, _ := json.Marshal(parsed.Script.Scenes)

	script := &model.Script{
		ID:         uuid.New().String(),
		TaskID:     taskID,
		Metadata:   metadataJSON,
		Characters: charactersJSON,
		Scenes:     scenesJSON,
		YAML:       yamlStr,
	}

	return s.scriptRepo.Create(script)
}
