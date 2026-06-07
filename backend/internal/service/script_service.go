package service

import (
	"encoding/json"
	"fmt"
	"log"
	"scriptsmith/internal/ai"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"

	"github.com/google/uuid"
)

type ScriptService struct {
	taskRepo     *repository.TaskRepository
	scriptRepo   *repository.ScriptRepository
	workRepo     *repository.WorkRepository
	providerRepo *repository.AIProviderRepository
	aiClient     *ai.Client
}

func NewScriptService(
	taskRepo *repository.TaskRepository,
	scriptRepo *repository.ScriptRepository,
	workRepo *repository.WorkRepository,
	providerRepo *repository.AIProviderRepository,
	aiClient *ai.Client,
) *ScriptService {
	return &ScriptService{
		taskRepo:     taskRepo,
		scriptRepo:   scriptRepo,
		workRepo:     workRepo,
		providerRepo: providerRepo,
		aiClient:     aiClient,
	}
}

// ConvertNovel 创建任务（pending）并立即返回 task_id；启动 goroutine 后台调 AI。
func (s *ScriptService) ConvertNovel(novelText, format, style, userID, workID, providerID string) (*model.Task, error) {
	if novelText == "" {
		return nil, fmt.Errorf("novel_text 不能为空")
	}
	if format == "" {
		format = "film"
	}
	if style == "" {
		style = "faithful"
	}

	task := &model.Task{
		ID:           uuid.New().String(),
		UserID:       userID,
		NovelText:    novelText,
		Format:       format,
		Style:        style,
		Status:       "pending",
		CurrentStage: "任务已创建，等待处理",
		Progress:     0.05,
	}
	if err := s.taskRepo.Create(task); err != nil {
		return nil, fmt.Errorf("创建任务失败: %w", err)
	}

	go s.processInBackground(task.ID, workID, providerID)

	return task, nil
}

// GetTask 查询任务状态
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

// resolveProvider 根据 providerID + userID 解析出 AI 调用配置
func (s *ScriptService) resolveProvider(providerID, userID string) (ai.ProviderConfig, *model.AIProvider) {
	if providerID != "" && s.providerRepo != nil {
		if p, err := s.providerRepo.GetByID(providerID, userID); err == nil {
			return ai.ProviderConfig{
				APIKey:    p.APIKey,
				BaseURL:   p.BaseURL,
				Model:     p.Model,
				MaxTokens: p.MaxTokens,
				Name:      p.Name,
			}, p
		}
	}
	if userID != "" && s.providerRepo != nil {
		if p, err := s.providerRepo.GetDefault(userID); err == nil {
			return ai.ProviderConfig{
				APIKey:    p.APIKey,
				BaseURL:   p.BaseURL,
				Model:     p.Model,
				MaxTokens: p.MaxTokens,
				Name:      p.Name,
			}, p
		}
	}
	return ai.ProviderConfig{Name: "system-default"}, nil
}

// processInBackground 后台处理：分阶段调用 AI 生成剧本
func (s *ScriptService) processInBackground(taskID, workID, providerID string) {
	defer func() {
		if r := recover(); r != nil {
			_ = s.taskRepo.UpdateStatus(taskID, "failed", 0, "", fmt.Sprintf("后台处理异常: %v", r), "任务异常，已中止")
			log.Printf("[task %s] panic recovered: %v", taskID, r)
		}
	}()

	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		log.Printf("[task %s] 读取任务失败: %v", taskID, err)
		return
	}

	// 1. 初始化 provider 配置
	if err := s.taskRepo.UpdateStatus(taskID, "processing", 0.15, "", "初始化大模型配置…", "解析 AI provider"); err != nil {
		log.Printf("[task %s] 更新 processing 状态失败: %v", taskID, err)
		return
	}

	cfg, _ := s.resolveProvider(providerID, task.UserID)

	// 2. 调用大模型
	providerName := "系统默认"
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		providerName = cfg.Name
	}
	if err := s.taskRepo.UpdateStatus(taskID, "processing", 0.35, "",
		fmt.Sprintf("正在通过「%s」生成剧本，请耐心等待…", providerName),
		"调用大模型生成中"); err != nil {
		log.Printf("[task %s] 更新 processing 状态失败: %v", taskID, err)
	}

	var script *model.Script
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		log.Printf("[task %s] 使用自定义 provider: %s (%s)", taskID, cfg.Name, cfg.Model)
		script, err = s.aiClient.ConvertNovelToStructuredWithConfig(cfg, task.NovelText, task.Format, task.Style)
	} else {
		log.Printf("[task %s] 使用系统默认 provider", taskID)
		script, err = s.aiClient.ConvertNovelToStructured(task.NovelText, task.Format, task.Style)
	}
	if err != nil {
		_ = s.taskRepo.UpdateStatus(taskID, "failed", 0, "", err.Error(), "AI 调用失败")
		log.Printf("[task %s] AI 转换失败: %v", taskID, err)
		return
	}

	// 3. 解析剧本结构
	if err := s.taskRepo.UpdateStatus(taskID, "processing", 0.75, "", "整理角色与场景结构…", "解析剧本结构"); err != nil {
		log.Printf("[task %s] 更新 processing 状态失败: %v", taskID, err)
	}

	// 4. 填充元信息后写库
	script.ID = uuid.New().String()
	script.TaskID = taskID
	if workID != "" {
		script.WorkID = &workID
		existing, _ := s.scriptRepo.ListByWorkID(workID)
		script.Episode = len(existing) + 1
	}
	script.Version = 1
	script.YAML = ""

	if err := s.taskRepo.UpdateStatus(taskID, "processing", 0.90, "", "保存剧本到数据库…", "写入数据库"); err != nil {
		log.Printf("[task %s] 更新 processing 状态失败: %v", taskID, err)
	}

	if err := s.scriptRepo.Create(script); err != nil {
		_ = s.taskRepo.UpdateStatus(taskID, "failed", 0, "", fmt.Sprintf("保存剧本失败: %v", err), "数据库写入失败")
		log.Printf("[task %s] 保存 Script 失败: %v", taskID, err)
		return
	}

	// 5. 完成
	if err := s.taskRepo.UpdateStatus(taskID, "completed", 1.0, "", "", "剧本生成完成"); err != nil {
		log.Printf("[task %s] 更新 completed 状态失败: %v", taskID, err)
		return
	}

	// 如果关联了作品，累加字数
	if workID != "" {
		if err := s.workRepo.AddWordCount(workID, len(task.NovelText)); err != nil {
			log.Printf("[task %s] 更新作品字数失败: %v", taskID, err)
		}
	}

	log.Printf("[task %s] 转换完成，Script ID: %s", taskID, script.ID)
}

// CancelTask 取消任务
func (s *ScriptService) CancelTask(taskID, userID, role string) error {
	task, err := func() (*model.Task, error) {
		if role == "admin" {
			return s.taskRepo.GetByID(taskID)
		}
		return s.taskRepo.GetByIDAndUser(taskID, userID)
	}()
	if err != nil {
		return fmt.Errorf("任务不存在")
	}
	if task.Status == "completed" || task.Status == "failed" {
		return fmt.Errorf("任务已结束，无法取消")
	}
	return s.taskRepo.UpdateStatus(taskID, "failed", task.Progress, "",
		"用户取消", "已被用户取消")
}

// CreateFromAI 调用 AI 生成结构化剧本并存入数据库
func (s *ScriptService) CreateFromAI(taskID, novelText string) (*model.Script, error) {
	script, err := s.aiClient.ConvertNovelToStructured(novelText, "film", "realistic")
	if err != nil {
		return nil, fmt.Errorf("AI 转换失败: %w", err)
	}

	script.ID = uuid.New().String()
	script.TaskID = taskID
	script.Version = 1

	if err := s.scriptRepo.Create(script); err != nil {
		return nil, fmt.Errorf("保存剧本失败: %w", err)
	}

	return script, nil
}

// GetStructuredScript 按脚本 ID 获取结构化剧本
func (s *ScriptService) GetStructuredScript(scriptID string) (*model.Script, error) {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return nil, fmt.Errorf("剧本不存在: %w", err)
	}
	return script, nil
}

// GetScriptByTaskID 按任务 ID 获取关联的结构化剧本
func (s *ScriptService) GetScriptByTaskID(taskID string) (*model.Script, error) {
	script, err := s.scriptRepo.GetByTaskID(taskID)
	if err != nil {
		return nil, fmt.Errorf("剧本不存在: %w", err)
	}
	return script, nil
}

// ListScriptsByWorkID 获取作品下所有剧本
func (s *ScriptService) ListScriptsByWorkID(workID string) ([]model.Script, error) {
	return s.scriptRepo.ListByWorkID(workID)
}

// SaveScript 全量保存剧本
func (s *ScriptService) SaveScript(scriptID string, updated *model.Script) error {
	_, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return fmt.Errorf("剧本不存在: %w", err)
	}
	updated.ID = scriptID
	updated.Version = updated.Version + 1
	return s.scriptRepo.Update(updated)
}

// DeleteScript 删除剧本及其关联任务
func (s *ScriptService) DeleteScript(scriptID, userID string) error {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return fmt.Errorf("剧本不存在: %w", err)
	}

	// 权限校验：通过关联的作品检查归属
	if script.WorkID != nil && *script.WorkID != "" {
		work, err := s.workRepo.Get(*script.WorkID)
		if err != nil {
			return fmt.Errorf("关联作品不存在: %w", err)
		}
		if work.UserID != userID {
			return fmt.Errorf("无权删除该剧本")
		}
	}

	// 删除关联任务
	if script.TaskID != "" {
		if err := s.taskRepo.Delete(script.TaskID); err != nil {
			log.Printf("删除任务 %s 失败: %v", script.TaskID, err)
		}
	}

	return s.scriptRepo.Delete(scriptID)
}
