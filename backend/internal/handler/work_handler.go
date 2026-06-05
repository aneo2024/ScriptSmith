package handler

import (
	"encoding/json"
	"log"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type WorkHandler struct {
	workRepo   *repository.WorkRepository
	scriptRepo *repository.ScriptRepository
	taskRepo   *repository.TaskRepository
}

func NewWorkHandler(
	workRepo *repository.WorkRepository,
	scriptRepo *repository.ScriptRepository,
	taskRepo *repository.TaskRepository,
) *WorkHandler {
	return &WorkHandler{workRepo: workRepo, scriptRepo: scriptRepo, taskRepo: taskRepo}
}

type CreateWorkRequest struct {
	Title             string                   `json:"title" binding:"required"`
	Synopsis          string                   `json:"synopsis"`
	Summary           string                   `json:"summary"`
	CoverImage        string                   `json:"cover_image"`
	Genre             string                   `json:"genre"`
	MainChar          string                   `json:"main_char"`
	CharacterProfiles []model.CharacterProfile `json:"character_profiles"`
	SupportingChars   []string                 `json:"supporting_chars"`
	WordCount         int                      `json:"word_count"`
}

type UpdateWorkRequest struct {
	Title             string                   `json:"title"`
	Synopsis          string                   `json:"synopsis"`
	Summary           string                   `json:"summary"`
	CoverImage        string                   `json:"cover_image"`
	Status            string                   `json:"status"`
	Genre             string                   `json:"genre"`
	MainChar          string                   `json:"main_char"`
	CharacterProfiles []model.CharacterProfile `json:"character_profiles"`
	SupportingChars   []string                 `json:"supporting_chars"`
	WordCount         int                      `json:"word_count"`
}

// CreateWork 创建作品
// POST /v1/works
func (h *WorkHandler) CreateWork(c *gin.Context) {
	var req CreateWorkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}

	userID := c.GetString("userID")
	work := &model.Work{
		ID:         uuid.New().String(),
		UserID:     userID,
		Title:      req.Title,
		Synopsis:   req.Synopsis,
		Summary:    req.Summary,
		CoverImage: req.CoverImage,
		Status:     "draft",
		Genre:      req.Genre,
		MainChar:   req.MainChar,
		WordCount:  req.WordCount,
	}

	if len(req.CharacterProfiles) > 0 {
		data, _ := json.Marshal(req.CharacterProfiles)
		work.CharacterProfiles = data
	}

	if len(req.SupportingChars) > 0 {
		data, _ := json.Marshal(req.SupportingChars)
		work.SupportingChars = data
	}

	if err := h.workRepo.Create(work); err != nil {
		ErrorInternal(c, err.Error())
		return
	}

	Created(c, work)
}

// GetWork 获取单个作品
// GET /v1/works/:id
func (h *WorkHandler) GetWork(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("userID")

	work, err := h.workRepo.Get(id)
	if err != nil {
		ErrorNotFound(c, "作品不存在")
		return
	}

	if work.UserID != userID {
		ErrorForbidden(c, "无权访问该作品")
		return
	}

	OK(c, work)
}

// ListWorks 获取用户的作品列表
// GET /v1/works
func (h *WorkHandler) ListWorks(c *gin.Context) {
	userID := c.GetString("userID")
	works, err := h.workRepo.ListByUserID(userID)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}

	OK(c, gin.H{"works": works})
}

// UpdateWork 更新作品
// PUT /v1/works/:id
func (h *WorkHandler) UpdateWork(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("userID")

	work, err := h.workRepo.Get(id)
	if err != nil {
		ErrorNotFound(c, "作品不存在")
		return
	}

	if work.UserID != userID {
		ErrorForbidden(c, "无权修改该作品")
		return
	}

	var req UpdateWorkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}

	if req.Title != "" {
		work.Title = req.Title
	}
	if req.Synopsis != "" {
		work.Synopsis = req.Synopsis
	}
	if req.Summary != "" {
		work.Summary = req.Summary
	}
	if req.CoverImage != "" {
		work.CoverImage = req.CoverImage
	}
	if req.Status != "" {
		work.Status = req.Status
	}
	if req.Genre != "" {
		work.Genre = req.Genre
	}
	if req.MainChar != "" {
		work.MainChar = req.MainChar
	}
	if len(req.CharacterProfiles) > 0 {
		data, _ := json.Marshal(req.CharacterProfiles)
		work.CharacterProfiles = data
	}
	if len(req.SupportingChars) > 0 {
		data, _ := json.Marshal(req.SupportingChars)
		work.SupportingChars = data
	}
	if req.WordCount > 0 {
		work.WordCount = req.WordCount
	}

	if err := h.workRepo.Update(work); err != nil {
		ErrorInternal(c, err.Error())
		return
	}

	OK(c, work)
}

// DeleteWork 删除作品（级联删除关联的剧本和任务）
// DELETE /v1/works/:id
func (h *WorkHandler) DeleteWork(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("userID")

	work, err := h.workRepo.Get(id)
	if err != nil {
		ErrorNotFound(c, "作品不存在")
		return
	}

	if work.UserID != userID {
		ErrorForbidden(c, "无权删除该作品")
		return
	}

	// 1. 找出该作品下的所有剧本
	scripts, err := h.scriptRepo.ListByWorkID(id)
	if err != nil {
		log.Printf("查询关联剧本失败: %v", err)
	}

	// 2. 删除每个剧本及其关联的任务
	for _, s := range scripts {
		if s.TaskID != "" {
			if err := h.taskRepo.Delete(s.TaskID); err != nil {
				log.Printf("删除任务 %s 失败: %v", s.TaskID, err)
			}
		}
		if err := h.scriptRepo.Delete(s.ID); err != nil {
			log.Printf("删除剧本 %s 失败: %v", s.ID, err)
		}
	}

	// 3. 删除作品
	if err := h.workRepo.Delete(id); err != nil {
		ErrorInternal(c, err.Error())
		return
	}

	log.Printf("作品 %s 及其 %d 个关联剧本已删除", id, len(scripts))
	OK(c, gin.H{"status": "ok", "deleted_scripts": len(scripts)})
}

// GetWorkCount 获取用户作品数量
// GET /v1/works/count
func (h *WorkHandler) GetWorkCount(c *gin.Context) {
	userID := c.GetString("userID")
	count, err := h.workRepo.CountByUserID(userID)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}

	OK(c, gin.H{"count": count})
}

// GetStats 获取用户作品统计（作品数 + 总字数）
// GET /v1/works/stats
func (h *WorkHandler) GetStats(c *gin.Context) {
	userID := c.GetString("userID")
	count, totalWords, err := h.workRepo.StatsByUserID(userID)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}

	OK(c, gin.H{"count": count, "total_words": totalWords})
}

// RegisterRoutes 注册路由
func (h *WorkHandler) RegisterRoutes(r *gin.Engine) {
	v1 := r.Group("/v1/works")
	{
		v1.POST("", h.CreateWork)
		v1.GET("", h.ListWorks)
		v1.GET("/count", h.GetWorkCount)
		v1.GET("/:id", h.GetWork)
		v1.PUT("/:id", h.UpdateWork)
		v1.DELETE("/:id", h.DeleteWork)
	}
}
