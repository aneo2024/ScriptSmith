package ai

import (
	"fmt"
	"strings"
)

// GenerateInspirationArticle AI 生成剧本创作知识文章（使用系统默认 provider）
func (c *Client) GenerateInspirationArticle(topic string) (string, error) {
	if c.defaultConfig.APIKey == "" {
		return "", fmt.Errorf("DEEPSEEK_API_KEY 未配置")
	}

	systemPrompt := `你是一位资深的剧本创作导师，擅长撰写关于编剧技巧、故事结构、人物塑造等方面的知识文章。
你的文章应当：
1. 专业、有深度，同时通俗易懂
2. 包含具体的案例分析
3. 使用 Markdown 格式，结构清晰
4. 600-1200 字左右
5. 要有实用价值，让读者能立刻应用到创作中`

	userPrompt := fmt.Sprintf(`请以"%s"为主题，撰写一篇剧本创作知识文章。

要求：
- 使用 Markdown 格式，包含标题、小标题、要点列表
- 开头用一个吸引人的引言
- 包含 2-3 个具体的影视/文学案例分析
- 结尾给出实用的创作建议或练习
- 字数控制在 600-1200 字之间

只输出文章内容，不要额外的说明。`, topic)

	return c.chat(c.defaultConfig, systemPrompt, userPrompt)
}

var defaultInspirationTopics = []string{
	"如何塑造让观众印象深刻的主角",
	"剧本开场前5分钟的黄金法则",
	"对白写作：让每句话都推动剧情",
	"冲突设计：从内心挣扎到外部对抗",
	"场景转场的艺术：流畅叙事的秘诀",
	"反派人物塑造：让对手同样出彩",
	"三幕剧结构详解与实战应用",
	"剧本节奏控制：张弛有度的秘密",
	"伏笔与回收：让观众拍案叫绝的技巧",
	"改编小说为剧本的十大注意事项",
}

// GetDefaultTopics 返回预设的灵感话题列表
func GetDefaultTopics() []string {
	return defaultInspirationTopics
}

// BatchGenerateArticles 批量 AI 生成多篇文章（可用于定时任务或初始化）
func (c *Client) BatchGenerateArticles(topics []string) (map[string]string, error) {
	results := make(map[string]string)
	var lastErr error

	for _, topic := range topics {
		content, err := c.GenerateInspirationArticle(topic)
		if err != nil {
			lastErr = err
			continue
		}
		results[topic] = strings.TrimSpace(content)
	}

	if len(results) == 0 && lastErr != nil {
		return nil, lastErr
	}

	return results, nil
}
