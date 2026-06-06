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
	NovelText string `json:"novel_text" binding:"required"`
	Format    string `json:"format"`
	Style     string `json:"style"`
	WorkID    string `json:"work_id"`
}

// Convert 提交小说，返回任务ID（立即返回，后台异步调 AI）
// POST /v1/convert
func (h *ScriptHandler) Convert(c *gin.Context) {
	var req ConvertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := c.GetString("userID")
	task, err := h.svc.ConvertNovel(req.NovelText, req.Format, req.Style, userID, req.WorkID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
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
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
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
				c.JSON(http.StatusBadRequest, gin.H{"error": err2.Error()})
				return
			}
			c.Header("Content-Type", "text/yaml; charset=utf-8")
			c.String(http.StatusOK, yamlFromScript)
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, characters)
}

// GetScenes 获取场景列表
// GET /v1/script/:id/scenes
func (h *ScriptHandler) GetScenes(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("userID")
	role := c.GetString("role")
	scenes, err := h.svc.GetScenes(id, userID, role)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, scenes)
}

// HealthCheck 健康检查
func (h *ScriptHandler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// AdminListTasks 管理员查看所有任务
// GET /v1/admin/tasks
func (h *ScriptHandler) AdminListTasks(c *gin.Context) {
	tasks, err := h.svc.ListAllTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tasks": tasks})
}

// GetStructuredScript 获取结构化剧本的完整 JSON
// GET /v1/scripts/:scriptID
func (h *ScriptHandler) GetStructuredScript(c *gin.Context) {
	scriptID := c.Param("scriptID")
	script, err := h.svc.GetStructuredScript(scriptID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, script)
}

// GetScriptByTaskID 按任务 ID 获取关联的结构化剧本
// GET /v1/scripts/by-task/:taskID
func (h *ScriptHandler) GetScriptByTaskID(c *gin.Context) {
	taskID := c.Param("taskID")
	script, err := h.svc.GetScriptByTaskID(taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, script)
}

// ListWorkScripts 获取作品下的所有剧本
// GET /v1/works/:id/scripts
func (h *ScriptHandler) ListWorkScripts(c *gin.Context) {
	workID := c.Param("id")
	scripts, err := h.svc.ListScriptsByWorkID(workID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if scripts == nil {
		scripts = []model.Script{}
	}
	c.JSON(http.StatusOK, gin.H{"scripts": scripts})
}

// UpdateScene 更新剧本中的某个场景
// PUT /v1/scripts/:scriptID/scenes/:sceneID
func (h *ScriptHandler) UpdateScene(c *gin.Context) {
	scriptID := c.Param("scriptID")
	sceneID := c.Param("sceneID")

	var scene model.Scene
	if err := c.ShouldBindJSON(&scene); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.UpdateScene(scriptID, sceneID, scene); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// UpdateContent 更新剧本中的某个内容块
// PUT /v1/scripts/:scriptID/contents/:contentID
func (h *ScriptHandler) UpdateContent(c *gin.Context) {
	scriptID := c.Param("scriptID")
	contentID := c.Param("contentID")

	var content model.SceneContent
	if err := c.ShouldBindJSON(&content); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.UpdateContent(scriptID, contentID, content); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// AddContent 向剧本的某个场景中添加内容块
// POST /v1/scripts/:scriptID/scenes/:sceneID/contents
func (h *ScriptHandler) AddContent(c *gin.Context) {
	scriptID := c.Param("scriptID")
	sceneID := c.Param("sceneID")

	var content model.SceneContent
	if err := c.ShouldBindJSON(&content); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.svc.AddContent(scriptID, sceneID, content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

// DeleteContent 删除剧本中的某个内容块
// DELETE /v1/scripts/:scriptID/contents/:contentID
func (h *ScriptHandler) DeleteContent(c *gin.Context) {
	scriptID := c.Param("scriptID")
	contentID := c.Param("contentID")

	if err := h.svc.DeleteContent(scriptID, contentID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ExportYAML 导出剧本为 YAML 格式
// GET /v1/scripts/:scriptID/yaml
func (h *ScriptHandler) ExportYAML(c *gin.Context) {
	scriptID := c.Param("scriptID")
	yamlStr, err := h.svc.ExportYAML(scriptID, "", "")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.SaveScript(scriptID, &script); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// RegisterRoutes 注册路由
func (h *ScriptHandler) RegisterRoutes(r *gin.Engine) {
	v1 := r.Group("/v1")
	{
		v1.GET("/health", h.HealthCheck)
		v1.POST("/convert", h.Convert)
		v1.GET("/task/:id", h.GetTask)
		v1.GET("/script/:id", h.GetScript)
		v1.GET("/script/:id/characters", h.GetCharacters)
		v1.GET("/script/:id/scenes", h.GetScenes)
		// 结构化剧本路由
		v1.GET("/scripts/by-task/:taskID", h.GetScriptByTaskID)
		v1.GET("/scripts/:scriptID", h.GetStructuredScript)
		v1.GET("/scripts/:scriptID/yaml", h.ExportYAML)
		v1.PUT("/scripts/:scriptID", h.SaveScript)
		v1.PUT("/scripts/:scriptID/scenes/:sceneID", h.UpdateScene)
		v1.PUT("/scripts/:scriptID/contents/:contentID", h.UpdateContent)
	}
}
