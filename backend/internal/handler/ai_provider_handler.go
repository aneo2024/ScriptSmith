package handler

import (
	"scriptsmith/internal/ai"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"

	"github.com/gin-gonic/gin"
)

type AIProviderHandler struct {
	repo     *repository.AIProviderRepository
	aiClient *ai.Client
}

func NewAIProviderHandler(repo *repository.AIProviderRepository, aiClient *ai.Client) *AIProviderHandler {
	return &AIProviderHandler{repo: repo, aiClient: aiClient}
}

type createProviderRequest struct {
	Name      string `json:"name" binding:"required"`
	Provider  string `json:"provider" binding:"required"`
	BaseURL   string `json:"base_url" binding:"required"`
	Model     string `json:"model" binding:"required"`
	APIKey    string `json:"api_key" binding:"required"`
	MaxTokens int    `json:"max_tokens"`
	IsDefault bool   `json:"is_default"`
}

// POST /v1/ai/providers
func (h *AIProviderHandler) Create(c *gin.Context) {
	userID := c.GetString("userID")

	var req createProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}
	if req.MaxTokens <= 0 {
		req.MaxTokens = 32000
	}

	p := &model.AIProvider{
		UserID:    userID,
		Name:      req.Name,
		Provider:  req.Provider,
		BaseURL:   req.BaseURL,
		Model:     req.Model,
		APIKey:    req.APIKey,
		MaxTokens: req.MaxTokens,
		IsDefault: req.IsDefault,
	}
	if err := h.repo.Create(p); err != nil {
		ErrorInternal(c, err.Error())
		return
	}

	Created(c, gin.H{
		"id":         p.ID,
		"name":       p.Name,
		"provider":   p.Provider,
		"base_url":   p.BaseURL,
		"model":      p.Model,
		"max_tokens": p.MaxTokens,
		"is_default": p.IsDefault,
	})
}

// GET /v1/ai/providers
func (h *AIProviderHandler) List(c *gin.Context) {
	userID := c.GetString("userID")
	providers, err := h.repo.ListByUser(userID)
	if err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	if providers == nil {
		providers = []*model.AIProvider{}
	}

	// 不返回 API key
	out := make([]gin.H, 0, len(providers))
	for _, p := range providers {
		out = append(out, gin.H{
			"id":         p.ID,
			"name":       p.Name,
			"provider":   p.Provider,
			"base_url":   p.BaseURL,
			"model":      p.Model,
			"max_tokens": p.MaxTokens,
			"is_default": p.IsDefault,
			"created_at": p.CreatedAt,
		})
	}
	OK(c, gin.H{"providers": out})
}

type updateProviderRequest struct {
	Name      string `json:"name"`
	Provider  string `json:"provider"`
	BaseURL   string `json:"base_url"`
	Model     string `json:"model"`
	APIKey    string `json:"api_key"`
	MaxTokens int    `json:"max_tokens"`
	IsDefault *bool  `json:"is_default"` // 用指针区分 false 和未传
}

// PUT /v1/ai/providers/:id
func (h *AIProviderHandler) Update(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	var req updateProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}

	isDefault := false
	if req.IsDefault != nil {
		isDefault = *req.IsDefault
	}

	if req.Name != "" || req.Provider != "" || req.BaseURL != "" || req.Model != "" || req.MaxTokens > 0 || req.IsDefault != nil {
		p := &model.AIProvider{
			Name:      req.Name,
			Provider:  req.Provider,
			BaseURL:   req.BaseURL,
			Model:     req.Model,
			MaxTokens: req.MaxTokens,
			IsDefault: isDefault,
		}
		if err := h.repo.Update(id, userID, p); err != nil {
			ErrorInternal(c, err.Error())
			return
		}
	}

	if req.APIKey != "" {
		if err := h.repo.UpdateAPIKey(id, userID, req.APIKey); err != nil {
			ErrorInternal(c, err.Error())
			return
		}
	}

	OK(c, gin.H{"status": "ok"})
}

// PUT /v1/ai/providers/:id/default
func (h *AIProviderHandler) SetDefault(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	if err := h.repo.SetDefault(id, userID); err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	OK(c, gin.H{"status": "ok"})
}

// DELETE /v1/ai/providers/:id
func (h *AIProviderHandler) Delete(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	if err := h.repo.Delete(id, userID); err != nil {
		ErrorInternal(c, err.Error())
		return
	}
	OK(c, gin.H{"status": "ok"})
}

// POST /v1/ai/providers/:id/test
// 用指定 provider 发一条小消息测试连接
func (h *AIProviderHandler) Test(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	p, err := h.repo.GetByID(id, userID)
	if err != nil {
		ErrorNotFound(c, "provider 不存在或无权访问")
		return
	}

	cfg := ai.ProviderConfig{
		APIKey:    p.APIKey,
		BaseURL:   p.BaseURL,
		Model:     p.Model,
		MaxTokens: 100,
		Name:      p.Name,
	}

	resp, err := h.aiClient.GenerateScriptSummaryWithConfig(cfg, "场景1: 测试场景")
	if err != nil {
		ErrorInternal(c, "测试失败: "+err.Error())
		return
	}
	OK(c, gin.H{"reply": resp})
}
