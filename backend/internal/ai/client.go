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
	"strings"
	"time"

	"scriptsmith/internal/model"
)

// yamlBlockRegex 匹配 AI 返回中 ```yaml ... ``` 代码块内容
var yamlBlockRegex = regexp.MustCompile("(?s)```yaml\\n(.*?)\\n```")

// yamlBlockRegexLoose 兼容截断场景：只匹配 ```yaml 开头之后的内容（不要求闭合 ```）
var yamlBlockRegexLoose = regexp.MustCompile("(?s)```yaml\\n(.*)")

// jsonBlockRegex 匹配 AI 返回中 ```json ... ``` 代码块内容
var jsonBlockRegex = regexp.MustCompile("(?s)```json\\n(.*?)\\n```")

// jsonBlockRegexLoose 兼容截断场景
var jsonBlockRegexLoose = regexp.MustCompile("(?s)```json\\n(.*)")

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

// ConvertNovelToStructured 将小说转换为结构化剧本（JSON 格式）
func (c *Client) ConvertNovelToStructured(novelText string) (*model.Script, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("DEEPSEEK_API_KEY 未配置")
	}

	content, err := c.callAI(buildStructuredPrompt(novelText), "你是一位专业编剧，擅长将小说改编为剧本。只输出 JSON 格式的剧本数据，不要任何解释。")
	if err != nil {
		return nil, err
	}

	jsonStr := extractJSON(content)
	if jsonStr == "" {
		return nil, fmt.Errorf("AI 返回中未找到 JSON 数据")
	}

	var script model.Script
	if err := json.Unmarshal([]byte(jsonStr), &script); err != nil {
		return nil, fmt.Errorf("解析 JSON 剧本失败: %w\n原始数据: %s", err, jsonStr)
	}

	return &script, nil
}

// callAI 调用 DeepSeek API，返回 message content
func (c *Client) callAI(prompt, systemPrompt string) (string, error) {
	reqBody := map[string]interface{}{
		"model": c.model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
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
		return "", fmt.Errorf("AI 未返回任何内容")
	}

	return result.Choices[0].Message.Content, nil
}

// extractJSON 从 AI 返回内容中提取 JSON 字符串，清理 markdown 代码块
func extractJSON(content string) string {
	// 先尝试严格匹配 ```json ... ``` 代码块
	if matches := jsonBlockRegex.FindStringSubmatch(content); len(matches) > 1 {
		return matches[1]
	}

	// 宽松匹配
	if matches := jsonBlockRegexLoose.FindStringSubmatch(content); len(matches) > 1 {
		return matches[1]
	}

	// 尝试找到 { 开头 } 结尾的 JSON
	content = strings.TrimSpace(content)
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		return content[start : end+1]
	}

	return ""
}

// buildStructuredPrompt 构建结构化 JSON 输出的 Prompt
func buildStructuredPrompt(novelText string) string {
	return fmt.Sprintf(`将以下小说改编为剧本，以 JSON 格式输出。

要求：
1. 删除纯心理描写，转为动作或对话暗示
2. 合并功能重复的次要角色
3. 每场景聚焦一个戏剧冲突点
4. 对话口语化，有潜台词
5. 只输出 JSON，不含解释

JSON 结构体（严格按此结构输出）：
{
  "id": "自动生成 UUID",
  "task_id": "",
  "metadata": {
    "title": "剧本标题",
    "original_title": "原著标题",
    "author": "原著作者",
    "adapter": "",
    "genre": "题材类型",
    "format": "电影/电视剧",
    "episodes": 1
  },
  "characters": [
    {
      "id": "char_1",
      "name": "角色名",
      "type": "protagonist|antagonist|supporting|extra",
      "description": "角色描述",
      "age": "年龄",
      "gender": "性别",
      "occupation": "职业",
      "arc": "角色弧光"
    }
  ],
  "scenes": [
    {
      "id": "scene_1",
      "sequence": 1,
      "title": "场景标题",
      "slugline": {
        "type": "interior|exterior|both",
        "name": "地点名称",
        "time": "day|night|dawn|dusk|continuous"
      },
      "content": [
        {
          "id": "elem_1",
          "type": "action",
          "description": "动作描述"
        },
        {
          "id": "elem_2",
          "type": "dialogue",
          "character_id": "char_1",
          "character_name": "角色名",
          "text": "台词内容",
          "emotion": "情绪",
          "parenthetical": ""
        },
        {
          "id": "elem_3",
          "type": "transition",
          "transition_type": "CUT TO:|FADE OUT.|DISSOLVE TO:"
        },
        {
          "id": "elem_4",
          "type": "sound",
          "sound_type": "音效类型",
          "sound_description": "音效描述"
        },
        {
          "id": "elem_5",
          "type": "note",
          "note_type": "备注类型",
          "note_text": "备注内容"
        }
      ],
      "characters_present": ["char_1", "char_2"],
      "mood": "场景氛围",
      "notes": "场景备注"
    }
  ],
  "yaml": "",
  "version": 1
}

小说文本：
%s`, novelText)
}
