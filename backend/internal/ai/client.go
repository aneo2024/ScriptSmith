package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"time"
)

// yamlBlockRegex 匹配 AI 返回中 ```yaml ... ``` 代码块内容
var yamlBlockRegex = regexp.MustCompile("(?s)```yaml\\n(.*?)\\n```")

// yamlBlockRegexLoose 兼容截断场景：只匹配 ```yaml 开头之后的内容（不要求闭合 ```）
var yamlBlockRegexLoose = regexp.MustCompile("(?s)```yaml\\n(.*)")

type Client struct {
	apiKey    string
	baseURL   string
	model     string
	maxTokens int
	client    *http.Client
}

func NewClient() *Client {
	apiKey := os.Getenv("DEEPSEEK_API_KEY")
	baseURL := os.Getenv("DEEPSEEK_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.deepseek.com/v1"
	}
	model := os.Getenv("DEEPSEEK_MODEL")
	if model == "" {
		model = "deepseek-chat"
	}
	maxTokens := 16384
	if v := os.Getenv("DEEPSEEK_MAX_TOKENS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxTokens = n
		}
	}
	return &Client{
		apiKey:    apiKey,
		baseURL:   baseURL,
		model:     model,
		maxTokens: maxTokens,
		client:    &http.Client{Timeout: 5 * time.Minute},
	}
}

func (c *Client) ConvertNovel(novelText, format, style string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("DEEPSEEK_API_KEY 未配置")
	}
	prompt := buildPrompt(novelText, format, style)

	reqBody := map[string]interface{}{
		"model": c.model,
		"messages": []map[string]string{
			{"role": "system", "content": "你是一位专业编剧，擅长将小说改编为剧本。只输出 YAML 格式的剧本，不要任何解释。"},
			{"role": "user", "content": prompt},
		},
		"temperature": 0.7,
		"max_tokens":  c.maxTokens,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}
	req, err := http.NewRequest("POST", c.baseURL+"/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("构建请求失败: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("调用 AI 失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("AI 服务返回错误状态 %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("解析响应失败: %w, body=%s", err, string(body))
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	content := result.Choices[0].Message.Content
	finishReason := result.Choices[0].FinishReason

	// 先尝试严格匹配 ```yaml ... ``` 代码块
	matches := yamlBlockRegex.FindStringSubmatch(content)
	if len(matches) > 1 {
		return matches[1], nil
	}

	// 宽松匹配：可能是 max_tokens 截断导致缺少闭合 ```
	if looseMatches := yamlBlockRegexLoose.FindStringSubmatch(content); len(looseMatches) > 1 {
		if finishReason == "length" {
			return looseMatches[1], fmt.Errorf("AI 输出因 token 限制被截断（finish_reason=length），当前 max_tokens=%d，请增大 DEEPSEEK_MAX_TOKENS 或缩短输入", c.maxTokens)
		}
		return looseMatches[1], nil
	}

	// 不是代码块格式，直接返回（可能也是截断）
	if finishReason == "length" {
		return content, fmt.Errorf("AI 输出因 token 限制被截断（finish_reason=length），当前 max_tokens=%d，请增大 DEEPSEEK_MAX_TOKENS 或缩短输入", c.maxTokens)
	}
	return content, nil
}

func buildPrompt(novelText, format, style string) string {
	return fmt.Sprintf(`将以下小说改编为剧本，YAML格式。

改编配置：
- 格式：%s
- 风格：%s

要求：
1. 删除纯心理描写，转为动作或对话暗示
2. 合并功能重复的次要角色
3. 每场景聚焦一个戏剧冲突点
4. 对话口语化，有潜台词
5. 添加 slugline（内景/外景·地点·时间）
6. 只输出YAML代码块

YAML结构：
script:
  metadata:
    title: string
    original_title: string
    format: string
  characters:
    - id: string
      name: string
      type: protagonist|antagonist|supporting|extra
      description: string
  scenes:
    - id: string
      sequence: integer
      title: string
      slugline: string
      characters_present: [string]
      content:
        - type: action|dialogue|transition|sound|note
          [对应字段]

小说文本：
%s
`, format, style, novelText)
}
