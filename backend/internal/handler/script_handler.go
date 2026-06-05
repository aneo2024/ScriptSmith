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
		ErrorBadRequest(c, err.Error())
		return
	}
	userID := c.GetString("userID")
	task, err := h.svc.ConvertNovel(req.NovelText, req.Format, req.Style, userID, req.WorkID)
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
				ErrorBadRequest(c, err2.Error())
				return
			}
			c.Header("Content-Type", "text/yaml; charset=utf-8")
			c.String(http.StatusOK, yamlFromScript)
			return
		}
		ErrorBadRequest(c, err.Error())
		return
	}
	c.Header("Content-Type", "text/yaml; charset=utf-8")
	c.String(http.StatusOK, y