package model

import "time"

// Article 灵感文章
type Article struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"type:text;not null" json:"title"`
	Summary     string    `gorm:"type:text" json:"summary"`      // 摘要
	Content     string    `gorm:"type:text" json:"content"`      // 正文（Markdown）
	CoverImage  string    `gorm:"type:text" json:"cover_image"`  // 封面图
	Tags        string    `gorm:"type:text" json:"tags"`         // 标签，逗号分隔
	AuthorID    string    `gorm:"index" json:"author_id"`        // 作者用户ID
	AuthorName  string    `gorm:"type:text" json:"author_name"`  // 作者名
	IsOfficial  bool      `gorm:"default:false" json:"is_official"` // 是否官方文章
	ViewCount   int       `gorm:"default:0" json:"view_count"`   // 阅读量
	LikeCount   int       `gorm:"default:0" json:"like_count"`   // 点赞数
	TopicID     string    `gorm:"index" json:"topic_id"`         // 关联的话题ID
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Topic 推荐话题
type Topic struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"type:text;not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	CoverImage  string    `gorm:"type:text" json:"cover_image"`
	IsOfficial  bool      `gorm:"default:true" json:"is_official"` // 是否官方推荐
	ArticleCount int      `gorm:"default:0" json:"article_count"`  // 关联文章数
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
