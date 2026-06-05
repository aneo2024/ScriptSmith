package handler

import (
	"log"
	"net/http"
	"scriptsmith/internal/ai"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InspirationHandler struct {
	articleRepo *repository.ArticleRepository
	aiClient    *ai.Client
}

func NewInspirationHandler(articleRepo *repository.ArticleRepository, aiClient *ai.Client) *InspirationHandler {
	return &InspirationHandler{articleRepo: articleRepo, aiClient: aiClient}
}

// ===================== 文章 =====================

type CreateArticleRequest struct {
	Title      string `json:"title" binding:"required"`
	Summary    string `json:"summary"`
	Content    string `json:"content" binding:"required"`
	CoverImage string `json:"cover_image"`
	Tags       string `json:"tags"`
	TopicID    string `json:"topic_id"`
}

// CreateArticle 创建文章（用户发帖 / 官方发帖）
// POST /v1/inspiration/articles
func (h *InspirationHandler) CreateArticle(c *gin.Context) {
	var req CreateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("userID")
	username := c.GetString("username")
	if username == "" {
		username = "匿名用户"
	}
	role := c.GetString("role")

	article := &model.Article{
		ID:         uuid.New().String(),
		Title:      req.Title,
		Summary:    req.Summary,
		Content:    req.Content,
		CoverImage: req.CoverImage,
		Tags:       req.Tags,
		AuthorID:   userID,
		AuthorName: username,
		IsOfficial: role == "admin",
		TopicID:    req.TopicID,
	}

	if err := h.articleRepo.CreateArticle(article); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 更新话题文章数
	if article.TopicID != "" {
		if err := h.articleRepo.UpdateTopicArticleCount(article.TopicID); err != nil {
			log.Printf("更新话题文章数失败: %v", err)
		}
	}

	c.JSON(http.StatusCreated, article)
}

// GetArticle 获取文章详情
// GET /v1/inspiration/articles/:id
func (h *InspirationHandler) GetArticle(c *gin.Context) {
	id := c.Param("id")
	article, err := h.articleRepo.GetArticle(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
		return
	}

	// 异步增加阅读量
	go func() {
		if err := h.articleRepo.IncrementViewCount(id); err != nil {
			log.Printf("增加阅读量失败: %v", err)
		}
	}()

	c.JSON(http.StatusOK, article)
}

// ListArticles 文章列表（支持分页和官方筛选）
// GET /v1/inspiration/articles?page=1&size=10&official=true
func (h *InspirationHandler) ListArticles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "10"))
	officialOnly := c.Query("official") == "true"
	topicID := c.Query("topic_id")

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 50 {
		size = 10
	}
	offset := (page - 1) * size

	if topicID != "" {
		articles, total, err := h.articleRepo.ListArticlesByTopic(topicID, size, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if articles == nil {
			articles = []model.Article{}
		}
		c.JSON(http.StatusOK, gin.H{
			"articles":  articles,
			"total":     total,
			"page":      page,
			"page_size": size,
		})
		return
	}

	articles, total, err := h.articleRepo.ListArticles(size, offset, officialOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if articles == nil {
		articles = []model.Article{}
	}

	c.JSON(http.StatusOK, gin.H{
		"articles":  articles,
		"total":     total,
		"page":      page,
		"page_size": size,
	})
}

// LikeArticle 点赞文章
// POST /v1/inspiration/articles/:id/like
func (h *InspirationHandler) LikeArticle(c *gin.Context) {
	id := c.Param("id")
	if err := h.articleRepo.IncrementLikeCount(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ===================== 话题 =====================

type CreateTopicRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	CoverImage  string `json:"cover_image"`
}

// CreateTopic 管理员创建推荐话题
// POST /v1/inspiration/topics
func (h *InspirationHandler) CreateTopic(c *gin.Context) {
	var req CreateTopicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	topic := &model.Topic{
		ID:          uuid.New().String(),
		Title:       req.Title,
		Description: req.Description,
		CoverImage:  req.CoverImage,
		IsOfficial:  true,
	}

	if err := h.articleRepo.CreateTopic(topic); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, topic)
}

// ListTodayTopics 今日话题排行榜
// GET /v1/inspiration/topics/today
func (h *InspirationHandler) ListTodayTopics(c *gin.Context) {
	topics, err := h.articleRepo.ListTodayTopics(10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if topics == nil {
		topics = []model.Topic{}
	}
	c.JSON(http.StatusOK, gin.H{"topics": topics})
}

// ListTopics 所有话题列表
// GET /v1/inspiration/topics?page=1&size=10
func (h *InspirationHandler) ListTopics(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "10"))

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 50 {
		size = 10
	}
	offset := (page - 1) * size

	topics, total, err := h.articleRepo.ListAllTopics(size, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if topics == nil {
		topics = []model.Topic{}
	}
	c.JSON(http.StatusOK, gin.H{
		"topics":    topics,
		"total":     total,
		"page":      page,
		"page_size": size,
	})
}

// ===================== AI 生成官方文章 =====================

type GenerateArticleRequest struct {
	Topic string `json:"topic" binding:"required"` // 创作主题（如：人物塑造、开场技巧等）
}

// GenerateArticle AI 自动生成一篇剧本创作知识文章
// POST /v1/inspiration/generate
func (h *InspirationHandler) GenerateArticle(c *gin.Context) {
	if h.aiClient == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI 服务未配置"})
		return
	}

	var req GenerateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 先创建话题
	topic := &model.Topic{
		ID:          uuid.New().String(),
		Title:       req.Topic,
		Description: "AI 自动生成的推荐话题",
		IsOfficial:  true,
	}
	if err := h.articleRepo.CreateTopic(topic); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建话题失败: " + err.Error()})
		return
	}

	// 异步 AI 生成文章
	go func() {
		content, err := h.aiClient.GenerateInspirationArticle(req.Topic)
		if err != nil {
			log.Printf("AI 生成灵感文章失败 (topic=%s): %v", req.Topic, err)
			return
		}

		// 从内容中提取标题（假设第一行是 # 标题）
		title := req.Topic
		summary := ""
		lines := strings.Split(content, "\n")
		if len(lines) > 0 {
			firstLine := strings.TrimPrefix(lines[0], "# ")
			firstLine = strings.TrimPrefix(firstLine, "#")
			if strings.TrimSpace(firstLine) != "" {
				title = strings.TrimSpace(firstLine)
			}
		}
		if len(lines) > 2 {
			summary = strings.TrimSpace(lines[1])
			if len([]rune(summary)) > 100 {
				summary = string([]rune(summary)[:100]) + "…"
			}
		}

		article := &model.Article{
			ID:         uuid.New().String(),
			Title:      title,
			Summary:    summary,
			Content:    content,
			AuthorName: "AI 剧作助手",
			IsOfficial: true,
			Tags:       "剧本创作," + req.Topic,
			TopicID:    topic.ID,
		}

		if err := h.articleRepo.CreateArticle(article); err != nil {
			log.Printf("保存 AI 生成文章失败: %v", err)
			return
		}

		if err := h.articleRepo.UpdateTopicArticleCount(topic.ID); err != nil {
			log.Printf("更新话题文章数失败: %v", err)
		}

		log.Printf("AI 灵感文章已生成: %s (topic=%s)", title, req.Topic)
	}()

	c.JSON(http.StatusOK, gin.H{
		"status":  "generating",
		"message": "AI 正在生成文章，请稍后刷新",
		"topic":   topic,
	})
}
