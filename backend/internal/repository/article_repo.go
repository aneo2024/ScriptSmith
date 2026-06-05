package repository

import (
	"scriptsmith/internal/model"
	"time"

	"gorm.io/gorm"
)

type ArticleRepository struct {
	db *gorm.DB
}

func NewArticleRepository(db *gorm.DB) *ArticleRepository {
	return &ArticleRepository{db: db}
}

// --- 文章 ---

func (r *ArticleRepository) CreateArticle(a *model.Article) error {
	return r.db.Create(a).Error
}

func (r *ArticleRepository) GetArticle(id string) (*model.Article, error) {
	var a model.Article
	err := r.db.First(&a, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *ArticleRepository) ListArticles(limit, offset int, officialOnly bool) ([]model.Article, int64, error) {
	var articles []model.Article
	var total int64

	q := r.db.Model(&model.Article{})
	if officialOnly {
		q = q.Where("is_official = ?", true)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("created_at DESC").Limit(limit).Offset(offset).Find(&articles).Error
	if err != nil {
		return nil, 0, err
	}
	return articles, total, nil
}

func (r *ArticleRepository) ListArticlesByTopic(topicID string, limit, offset int) ([]model.Article, int64, error) {
	var articles []model.Article
	var total int64

	q := r.db.Model(&model.Article{}).Where("topic_id = ?", topicID)

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("created_at DESC").Limit(limit).Offset(offset).Find(&articles).Error
	if err != nil {
		return nil, 0, err
	}
	return articles, total, nil
}

func (r *ArticleRepository) IncrementViewCount(id string) error {
	return r.db.Model(&model.Article{}).Where("id = ?", id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}

func (r *ArticleRepository) IncrementLikeCount(id string) error {
	return r.db.Model(&model.Article{}).Where("id = ?", id).
		UpdateColumn("like_count", gorm.Expr("like_count + 1")).Error
}

// --- 话题 ---

func (r *ArticleRepository) CreateTopic(t *model.Topic) error {
	return r.db.Create(t).Error
}

func (r *ArticleRepository) GetTopic(id string) (*model.Topic, error) {
	var t model.Topic
	err := r.db.First(&t, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// ListTodayTopics 获取今天创建的话题（排行榜）
func (r *ArticleRepository) ListTodayTopics(limit int) ([]model.Topic, error) {
	var topics []model.Topic
	today := time.Now().Format("2006-01-02")
	err := r.db.Where("DATE(created_at) = ? AND is_official = ?", today, true).
		Order("article_count DESC").
		Limit(limit).
		Find(&topics).Error
	if err != nil {
		return nil, err
	}
	return topics, nil
}

func (r *ArticleRepository) ListAllTopics(limit, offset int) ([]model.Topic, int64, error) {
	var topics []model.Topic
	var total int64

	q := r.db.Model(&model.Topic{})

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("created_at DESC").Limit(limit).Offset(offset).Find(&topics).Error
	if err != nil {
		return nil, 0, err
	}
	return topics, total, nil
}

func (r *ArticleRepository) UpdateTopicArticleCount(topicID string) error {
	var count int64
	if err := r.db.Model(&model.Article{}).Where("topic_id = ?", topicID).Count(&count).Error; err != nil {
		return err
	}
	return r.db.Model(&model.Topic{}).Where("id = ?", topicID).
		Update("article_count", count).Error
}
