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

// yamlBlockRegex
var yamlBlockRegex = regexp.MustCompile("(?s)```yaml\\n(.*?)\\n```")

// yamlBlockRegexLoose 兼容截断场景：只匹配 ```yaml 开头之后的内容
var yamlBlockRegexLoose = regexp.MustCompile("(?s)```yaml\\n(.*)")

// jsonBlockRegex 匹配 AI 返回中 ```json ... ``` 代码块内容
var jsonBlockRegex = regexp.MustCompile("(?s)```json\\n(.*?)\\n```")

// jsonBlockRegexLoose 兼容截断场景
var jsonBlockRegexLoose = regexp.MustCompile("(?s)```json\\n(.*)")

// ProviderConfig 运行时的 provider 配置（来自用户的 AIProvider）
type ProviderConfig struct {
	APIKey    string
	BaseURL   string
	Model     string
	MaxTokens int
	Name      string // 日志用
}

type Client struct {
	defaultConfig ProviderConfig
	client        *http.Client
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
		defaultConfig: ProviderConfig{
			APIKey:    apiKey,
			BaseURL:   baseURL,
			Model:     model,
			MaxTokens: maxTokens,
			Name:      "system-default",
		},
		client: &http.Client{Timeout: 5 * time.Minute},
	}
}

// ============================ 核心 HTTP 调用 ============================

// chat 调用 OpenAI 兼容的 /chat/completions 接口，返回 message content
func (c *Client) chat(cfg ProviderConfig, systemPrompt, userPrompt string) (string, error) {
	if cfg.APIKey == "" {
		return "", fmt.Errorf("AI API key 未配置")
	}

	endpoint := strings.TrimRight(cfg.BaseURL, "/") + "/chat/completions"

	reqBody := map[string]interface{}{
		"model": cfg.Model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.7,
		"max_tokens":  cfg.MaxTokens,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("构建请求失败: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("调用 AI 失败 [%s]: %w", cfg.Name, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("AI 服务返回错误状态 %d [%s]: %s", resp.StatusCode, cfg.Name, string(body))
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
		return "", fmt.Errorf("解析响应失败 [%s]: %w, body=%s", cfg.Name, err, string(body))
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("AI 未返回任何内容 [%s]", cfg.Name)
	}

	return result.Choices[0].Message.Content, nil
}

// ============================ 高层方法（默认/指定 provider） ============================

// ConvertNovel 使用默认 provider 转换小说（老接口，保持兼容）
func (c *Client) ConvertNovel(novelText, format, style string) (string, error) {
	return c.convertNovel(c.defaultConfig, novelText, format, style)
}

// ConvertNovelWithConfig 使用指定 provider 转换小说
func (c *Client) ConvertNovelWithConfig(cfg ProviderConfig, novelText, format, style string) (string, error) {
	return c.convertNovel(cfg, novelText, format, style)
}

func (c *Client) convertNovel(cfg ProviderConfig, novelText, format, style string) (string, error) {
	prompt := buildPrompt(novelText, format, style)
	content, err := c.chat(cfg, "你是一位专业编剧，擅长将小说改编为剧本。只输出 YAML 格式的剧本，不要任何解释。", prompt)
	if err != nil {
		return "", err
	}

	if matches := yamlBlockRegex.FindStringSubmatch(content); len(matches) > 1 {
		return matches[1], nil
	}
	if matches := yamlBlockRegexLoose.FindStringSubmatch(content); len(matches) > 1 {
		return matches[1], nil
	}
	return content, nil
}

// ConvertNovelToStructured 使用默认 provider 生成结构化 JSON 剧本
func (c *Client) ConvertNovelToStructured(novelText, format, style string) (*model.Script, error) {
	return c.convertNovelToStructured(c.defaultConfig, novelText, format, style)
}

// ConvertNovelToStructuredWithConfig 使用指定 provider
func (c *Client) ConvertNovelToStructuredWithConfig(cfg ProviderConfig, novelText, format, style string) (*model.Script, error) {
	return c.convertNovelToStructured(cfg, novelText, format, style)
}

func (c *Client) convertNovelToStructured(cfg ProviderConfig, novelText, format, style string) (*model.Script, error) {
	content, err := c.chat(cfg,
		"你是一位专业编剧，擅长将小说改编为剧本。只输出 JSON 格式的剧本数据，不要任何解释。",
		buildStructuredPrompt(novelText, format, style))
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

// GenerateScriptSummary 使用默认 provider
func (c *Client) GenerateScriptSummary(scenesText string) (string, error) {
	return c.generateScriptSummary(c.defaultConfig, scenesText)
}

// GenerateScriptSummaryWithConfig 使用指定 provider
func (c *Client) GenerateScriptSummaryWithConfig(cfg ProviderConfig, scenesText string) (string, error) {
	return c.generateScriptSummary(cfg, scenesText)
}

func (c *Client) generateScriptSummary(cfg ProviderConfig, scenesText string) (string, error) {
	systemPrompt := `你是一位资深剧本编辑，擅长用一句话概括一集剧本的核心内容。`
	userPrompt := fmt.Sprintf("请根据以下剧本的场景数据，用一句话（不超过50字）概括这一集的核心剧情。\n只输出这一句话梗概，不要任何额外的文字或标点修饰。\n\n场景数据：\n%s", scenesText)
	return c.chat(cfg, systemPrompt, userPrompt)
}

// ============================ 角色外貌 & 场景环境生成 ============================

// GenerateCharacterAppearances 使用默认 provider
func (c *Client) GenerateCharacterAppearances(charactersJSON, scenesSummary string) ([]map[string]string, error) {
	return c.generateCharacterAppearances(c.defaultConfig, charactersJSON, scenesSummary)
}

// GenerateCharacterAppearancesWithConfig 使用指定 provider
func (c *Client) GenerateCharacterAppearancesWithConfig(cfg ProviderConfig, charactersJSON, scenesSummary string) ([]map[string]string, error) {
	return c.generateCharacterAppearances(cfg, charactersJSON, scenesSummary)
}

func (c *Client) generateCharacterAppearances(cfg ProviderConfig, charactersJSON, scenesSummary string) ([]map[string]string, error) {
	systemPrompt := `你是一位影视角色造型设计师，擅长根据剧本为角色设计外貌特征。
只输出 JSON 数组，每个元素包含角色ID和外貌描述，不要任何解释。`

	userPrompt := fmt.Sprintf(`根据以下角色的基本信息和剧情摘要，为每个角色生成外貌特征描述（50-100字）。
外貌描述应包括：年龄感、体型、面部特征、发型发色、标志性装扮或气质。

角色列表（JSON）：
%s

剧情摘要：
%s

输出格式（严格 JSON 数组）：
[{"id": "char_1", "appearance": "外貌描述..."}, {"id": "char_2", "appearance": "外貌描述..."}]`, charactersJSON, scenesSummary)

	content, err := c.chat(cfg, systemPrompt, userPrompt)
	if err != nil {
		return nil, err
	}

	jsonStr := extractJSON(content)
	if jsonStr == "" {
		return nil, fmt.Errorf("AI 返回中未找到 JSON 数据")
	}

	var results []map[string]string
	if err := json.Unmarshal([]byte(jsonStr), &results); err != nil {
		return nil, fmt.Errorf("解析角色外貌失败: %w\n原始数据: %s", err, jsonStr)
	}
	return results, nil
}

// GenerateSceneEnvironments 使用默认 provider
func (c *Client) GenerateSceneEnvironments(scenesJSON string) ([]map[string]string, error) {
	return c.generateSceneEnvironments(c.defaultConfig, scenesJSON)
}

// GenerateSceneEnvironmentsWithConfig 使用指定 provider
func (c *Client) GenerateSceneEnvironmentsWithConfig(cfg ProviderConfig, scenesJSON string) ([]map[string]string, error) {
	return c.generateSceneEnvironments(cfg, scenesJSON)
}

func (c *Client) generateSceneEnvironments(cfg ProviderConfig, scenesJSON string) ([]map[string]string, error) {
	systemPrompt := `你是一位影视美术指导，擅长为剧本场景设计环境氛围与视觉特征。
只输出 JSON 数组，每个元素包含场景ID和环境描述，不要任何解释。`

	userPrompt := fmt.Sprintf(`根据以下场景的基本信息，为每个场景生成环境/氛围描述（50-100字）。
环境描述应包括：光线色调、空间质感、天气/温度感、声音环境、整体情绪氛围。

场景列表（JSON）：
%s

输出格式（严格 JSON 数组）：
[{"id": "scene_1", "environment": "环境描述..."}, {"id": "scene_2", "environment": "环境描述..."}]`, scenesJSON)

	content, err := c.chat(cfg, systemPrompt, userPrompt)
	if err != nil {
		return nil, err
	}

	jsonStr := extractJSON(content)
	if jsonStr == "" {
		return nil, fmt.Errorf("AI 返回中未找到 JSON 数据")
	}

	var results []map[string]string
	if err := json.Unmarshal([]byte(jsonStr), &results); err != nil {
		return nil, fmt.Errorf("解析场景环境失败: %w\n原始数据: %s", err, jsonStr)
	}
	return results, nil
}

// ============================ 作品级角色设定生成（人设卡） ============================

// GenerateWorkCharacterProfiles 使用默认 provider
func (c *Client) GenerateWorkCharacterProfiles(charactersJSON, synopsis string) ([]map[string]string, error) {
	return c.generateWorkCharacterProfiles(c.defaultConfig, charactersJSON, synopsis)
}

// GenerateWorkCharacterProfilesWithConfig 使用指定 provider
func (c *Client) GenerateWorkCharacterProfilesWithConfig(cfg ProviderConfig, charactersJSON, synopsis string) ([]map[string]string, error) {
	return c.generateWorkCharacterProfiles(cfg, charactersJSON, synopsis)
}

func (c *Client) generateWorkCharacterProfiles(cfg ProviderConfig, charactersJSON, synopsis string) ([]map[string]string, error) {
	systemPrompt := `你是一位资深人物设定师，擅长为剧本角色设计完整的人物小传。
只输出 JSON 数组，每个元素包含角色固定属性，不要任何解释。`

	userPrompt := fmt.Sprintf(`根据以下角色基本信息和剧情梗概，为每个角色生成完整的人物小传。

角色列表（JSON）：
%s

剧情梗概：
%s

为每个角色生成以下固定属性（20-50字）：
- appearance: 长相外貌特征（脸型、五官、体型、身高、肤色等固定生理特征）
- age: 具体年龄或年龄范围
- personality: 性格特质
- background: 简要背景故事/身世

输出格式（严格 JSON 数组）：
[{"id": "char_1", "name": "角色名", "appearance": "长相描述...", "age": "年龄", "personality": "性格...", "background": "背景..."}]`, charactersJSON, synopsis)

	content, err := c.chat(cfg, systemPrompt, userPrompt)
	if err != nil {
		return nil, err
	}

	jsonStr := extractJSON(content)
	if jsonStr == "" {
		return nil, fmt.Errorf("AI 返回中未找到 JSON 数据")
	}

	var results []map[string]string
	if err := json.Unmarshal([]byte(jsonStr), &results); err != nil {
		return nil, fmt.Errorf("解析角色设定失败: %w\n原始数据: %s", err, jsonStr)
	}
	return results, nil
}

// ============================ Prompt 与 JSON 抽取 ============================

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
%s`, format, style, novelText)
}

// extractJSON 从 AI 返回内容中提取 JSON 字符串，清理 markdown 代码块
func extractJSON(content string) string {
	if matches := jsonBlockRegex.FindStringSubmatch(content); len(matches) > 1 {
		return matches[1]
	}
	if matches := jsonBlockRegexLoose.FindStringSubmatch(content); len(matches) > 1 {
		return matches[1]
	}
	content = strings.TrimSpace(content)
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		return content[start : end+1]
	}
	return ""
}

// buildStructuredPrompt 构建结构化 JSON 输出的 Prompt
func buildStructuredPrompt(novelText, format, style string) string {
	if format == "" {
		format = "film"
	}
	if style == "" {
		style = "realistic"
	}

	// 格式→中文名，提示 AI 以帮助生成更符合格式的创作
	formatLabel := map[string]string{
		"film":        "电影剧本（约90-120页，三幕结构）",
		"tv_series":   "电视剧本（分集对白为主）",
		"stage_play":  "舞台剧（强调场景集中、对白驱动）",
		"animation":   "动画剧本（注重视觉想象力与夸张表现）",
		"short_film":  "短片剧本（约10-15页，单幕或双幕结构）",
		"web_series":  "网剧剧本（快节奏、网感强）",
		"documentary": "纪录片脚本（旁白+采访+真实场景描述）",
	}[format]
	if formatLabel == "" {
		formatLabel = format
	}

	styleLabel := map[string]string{
		"faithful":    "严格遵循原著的叙事节奏与语言风格，不随意增删情节",
		"commercial":  "强情节、快节奏，每场戏都紧扣观众注意力",
		"experimental": "打破传统叙事结构，允许非线性叙事、打破第四面墙等手法",
		"noir":        "黑色电影风格：阴暗色调、道德模糊、硬汉对白",
		"romantic":    "强调情感细腻描写，对白温柔富有诗意",
		"thriller":    "悬疑惊悚：制造紧张感、反转与伏笔",
		"wuxia":       "武侠风：江湖恩怨、武打场景、侠义精神",
		"xianxia":     "仙侠玄幻：仙法对决、瑰丽场景、宏大世界观",
		"comedy":      "喜剧幽默：夸张对白、误会巧合、笑点密集",
		"tragedy":     "悲剧深沉：人物命运曲折、情感厚重",
		"minimalist":  "极简留白：对白精炼、情感含蓄、以少胜多",
	}[style]
	if styleLabel == "" {
		styleLabel = style
	}

	return fmt.Sprintf(`将以下小说改编为剧本，以 JSON 格式输出。

改编配置：
- 格式：%s
- 风格要求：%s

要求：
1. 严格遵循上述风格要求进行改编
2. 删除纯心理描写，转为动作或对话暗示
3. 合并功能重复的次要角色
4. 每场景聚焦一个戏剧冲突点
5. 对话口语化，有潜台词
6. 只输出 JSON，不含解释

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
%s`, formatLabel, styleLabel, novelText)
}
