package handler

import (
	"net/http"
	"scriptsmith/internal/model"
	"scriptsmith/internal/service"

	"github.com/gin-gonic/gin"
)

type ScriptHandler struct {
	svc *service.ScriptService
}

func NewScriptHandler(svc *service.ScriptService) *ScriptHandler {
	return &ScriptHandler{svc: svc}
}

type ConvertRequest struct {
	NovelText  string `json:"novel_text" binding:"required"`
	Format     string `json:"format"`
	Style      string `json:"style"`
	WorkID     string `json:"work_id"`
	ProviderID string `json:"provider_id"` // 可选：选择用户配置的 AI provider
}

// Convert 提交小说，返回任务ID（立即返回，后台异步调 AI）
// POST /v1/convert
func (h *ScriptHandler) Convert(c *gin.Context) {
	var req ConvertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}
	userID := c.GetString("userID")
	task, err := h.svc.ConvertNovel(req.NovelText, req.Format, req.Style, userID, req.WorkID, req.ProviderID)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	OK(c, gin.H{
		"task_id":  task.ID,
		"status":   task.Status,
		"progress": task.Progress,
	})
}

// GetTask 查询任务状态
// GET /v1/task/:id
func (h *ScriptHandler) GetTask(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("userID")
	role := c.GetString("role")
	task, err := h.svc.GetTask(id, userID, role)
	if err != nil {
		ErrorNotFound(c, err.Error())
		return
	}
	OK(c, gin.H{
		"id":         task.ID,
		"status":     task.Status,
		"progress":   task.Progress,
		"format":     task.Format,
		"style":      task.Style,
		"created_at": task.CreatedAt,
		"updated_at": task.UpdatedAt,
		"error_msg":  task.ErrorMsg,
	})
}

// GetScript 获取转换完成的 YAML 剧本（优先从 Script 表生成）
// GET /v1/script/:id
func (h *ScriptHandler) GetScript(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("userID")
	role := c.GetString("role")
	yaml, err := h.svc.GetScript(id, userID, role)
	if err != nil {
		// 旧的 Task.ResultYAML 为空时，尝试从 Script 表按 taskID 生成
		if err.Error() == "剧本内容为空" {
			yamlFromScript, err2 := h.svc.ExportYAMLByTaskID(id)
			if err2 != nil {
				ErrorNotFound(c, err2.Error())
				return
			}
			c.Header("Content-Type", "text/yaml; charset=utf-8")
			c.String(http.StatusOK, yamlFromScript)
			return
		}
		ErrorNotFound(c, err.Error())
		return
	}
	c.Header("Content-Type", "text/yaml; charset=utf-8")
	c.String(http.StatusOK, yaml)
}

// GetCharacters 获取角色列表
// GET /v1/script/:id/characters
func (h *ScriptHandler) GetCharacters(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("userID")
	role := c.GetString("role")
	characters, err := h.svc.GetCharacters(id, userID, role)
	if err != nil {
		ErrorNotFound(c, err.Error())
		return
	}
	OK(c, characters)
}

// GetScenes 获取场景列表
// GET /v1/script/:id/scenes
func (h *ScriptHandler) GetScenes(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("userID")
	role := c.GetString("role")
	scenes, err := h.svc.GetScenes(id, userID, role)
	if err != nil {
		ErrorNotFound(c, err.Error())
		return
	}
	OK(c, scenes)
}

// HealthCheck 健康检查
func (h *ScriptHandler) HealthCheck(c *gin.Context) {
	OK(c, gin.H{"status": "ok"})
}

// AdminListTasks 管理员查看所有任务
// GET /v1/admin/tasks
func (h *ScriptHandler) AdminListTasks(c *gin.Context) {
	tasks, err := h.svc.ListAllTasks()
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	OK(c, gin.H{"tasks": tasks})
}

// GetStructuredScript 获取结构化剧本的完整 JSON
// GET /v1/scripts/:scriptID
func (h *ScriptHandler) GetStructuredScript(c *gin.Context) {
	scriptID := c.Param("scriptID")
	script, err := h.svc.GetStructuredScript(scriptID)
	if err != nil {
		ErrorNotFound(c, err.Error())
		return
	}
	OK(c, script)
}

// GetScriptByTaskID 按任务 ID 获取关联的结构化剧本
// GET /v1/scripts/by-task/:taskID
func (h *ScriptHandler) GetScriptByTaskID(c *gin.Context) {
	taskID := c.Param("taskID")
	script, err := h.svc.GetScriptByTaskID(taskID)
	if err != nil {
		ErrorNotFound(c, err.Error())
		return
	}
	OK(c, script)
}

// ListWorkScripts 获取作品下的所有剧本
// GET /v1/works/:id/scripts
func (h *ScriptHandler) ListWorkScripts(c *gin.Context) {
	workID := c.Param("id")
	scripts, err := h.svc.ListScriptsByWorkID(workID)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	if scripts == nil {
		scripts = []model.Script{}
	}
	OK(c, gin.H{"scripts": scripts})
}

// UpdateScene 更新剧本中的某个场景
// PUT /v1/scripts/:scriptID/scenes/:sceneID
func (h *ScriptHandler) UpdateScene(c *gin.Context) {
	scriptID := c.Param("scriptID")
	sceneID := c.Param("sceneID")

	var scene model.Scene
	if err := c.ShouldBindJSON(&scene); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}

	if err := h.svc.UpdateScene(scriptID, sceneID, scene); err != nil {
		ErrorNotFound(c, err.Error())
		return
	}
	OK(c, gin.H{"status": "ok"})
}

// UpdateContent 更新剧本中的某个内容块
// PUT /v1/scripts/:scriptID/contents/:contentID
func (h *ScriptHandler) UpdateContent(c *gin.Context) {
	scriptID := c.Param("scriptID")
	contentID := c.Param("contentID")

	var content model.SceneContent
	if err := c.ShouldBindJSON(&content); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}

	if err := h.svc.UpdateContent(scriptID, contentID, content); err != nil {
		ErrorNotFound(c, err.Error())
		return
	}
	OK(c, gin.H{"status": "ok"})
}

// AddContent 向剧本的某个场景中添加内容块
// POST /v1/scripts/:scriptID/scenes/:sceneID/contents
func (h *ScriptHandler) AddContent(c *gin.Context) {
	scriptID := c.Param("scriptID")
	sceneID := c.Param("sceneID")

	var content model.SceneContent
	if err := c.ShouldBindJSON(&content); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}

	created, err := h.svc.AddContent(scriptID, sceneID, content)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	Created(c, created)
}

// DeleteContent 删除剧本中的某个内容块
// DELETE /v1/scripts/:scriptID/contents/:contentID
func (h *ScriptHandler) DeleteContent(c *gin.Context) {
	scriptID := c.Param("scriptID")
	contentID := c.Param("contentID")

	if err := h.svc.DeleteContent(scriptID, contentID); err != nil {
		ErrorNotFound(c, err.Error())
		return
	}
	OK(c, gin.H{"status": "ok"})
}

// ExportYAML 导出剧本为 YAML 格式（纯文本响应，不 JSON 包装）
// GET /v1/scripts/:scriptID/yaml
func (h *ScriptHandler) ExportYAML(c *gin.Context) {
	scriptID := c.Param("scriptID")
	yamlStr, err := h.svc.ExportYAML(scriptID, "", "")
	if err != nil {
		ErrorNotFound(c, err.Error())
		return
	}
	c.Header("Content-Type", "text/yaml; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=script.yaml")
	c.String(http.StatusOK, yamlStr)
}

// SaveScript 全量保存剧本
// PUT /v1/scripts/:scriptID
func (h *ScriptHandler) SaveScript(c *gin.Context) {
	scriptID := c.Param("scriptID")

	var script model.Script
	if err := c.ShouldBindJSON(&script); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}

	if err := h.svc.SaveScript(scriptID, &script); err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	OK(c, gin.H{"status": "ok"})
}

// GenerateSummary AI 生成剧本一句话梗概
// POST /v1/scripts/:scriptID/summary
func (h *ScriptHandler) GenerateSummary(c *gin.Context) {
	scriptID := c.Param("scriptID")
	userID := c.GetString("userID")

	// 支持从 body 或 query 传 provider_id
	var body struct {
		ProviderID string `json:"provider_id"`
	}
	_ = c.ShouldBindJSON(&body)
	if body.ProviderID == "" {
		body.ProviderID = c.Query("provider_id")
	}

	summary, err := h.svc.GenerateSummary(scriptID, userID, body.ProviderID)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	OK(c, gin.H{"summary": summary})
}

// GenerateCharacterAppearances AI 生成角色外貌描述
// POST /v1/scripts/:scriptID/characters/appearance
func (h *ScriptHandler) GenerateCharacterAppearances(c *gin.Context) {
	scriptID := c.Param("scriptID")
	userID := c.GetString("userID")

	var body struct {
		ProviderID string `json:"provider_id"`
	}
	_ = c.ShouldBindJSON(&body)

	characters, err := h.svc.GenerateCharacterAppearances(scriptID, userID, body.ProviderID)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	OK(c, gin.H{"characters": characters})
}

// GenerateSceneEnvironments AI 生成场景环境/氛围描述
// POST /v1/scripts/:scriptID/scenes/environment
func (h *ScriptHandler) GenerateSceneEnvironments(c *gin.Context) {
	scriptID := c.Param("scriptID")
	userID := c.GetString("userID")

	var body struct {
		ProviderID string `json:"provider_id"`
	}
	_ = c.ShouldBindJSON(&body)

	scenes, err := h.svc.GenerateSceneEnvironments(scriptID, userID, body.ProviderID)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	OK(c, gin.H{"scenes": scenes})
}
