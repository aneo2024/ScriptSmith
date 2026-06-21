package service

import (
	"encoding/json"
	"fmt"
	"scriptsmith/internal/model"
	"strings"
)

// GenerateSummary 用 AI 生成剧本一句话梗概并保存
func (s *ScriptService) GenerateSummary(scriptID, userID, providerID string) (string, error) {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return "", fmt.Errorf("剧本不存在: %w", err)
	}

	var scenes []model.Scene
	if err := json.Unmarshal(script.Scenes, &scenes); err != nil {
		return "", fmt.Errorf("解析场景数据失败: %w", err)
	}

	var sb strings.Builder
	for _, sc := range scenes {
		sb.WriteString(fmt.Sprintf("场景%d: %s\n", sc.Sequence, sc.Title))
		for _, c := range sc.Content {
			switch c.Type {
			case "action":
				sb.WriteString(fmt.Sprintf("  [动作] %s\n", c.Description))
			case "dialogue":
				sb.WriteString(fmt.Sprintf("  [%s] %s\n", c.CharacterName, c.Text))
			}
		}
	}

	var summary string
	cfg, _ := s.resolveProvider(providerID, userID)
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		summary, err = s.aiClient.GenerateScriptSummaryWithConfig(cfg, sb.String())
	} else {
		summary, err = s.aiClient.GenerateScriptSummary(sb.String())
	}
	if err != nil {
		return "", fmt.Errorf("AI 生成梗概失败: %w", err)
	}

	summary = strings.TrimSpace(summary)
	script.Summary = summary
	if err := s.scriptRepo.Update(script); err != nil {
		return "", fmt.Errorf("保存梗概失败: %w", err)
	}

	return summary, nil
}

// GenerateCharacterAppearances 用 AI 生成角色外貌描述并保存回剧本
// 完整流程:
//   1. 从数据库查剧本 → 2. 解析角色 JSON → 3. 提取角色名/类型/描述发给 AI
//   → 4. 同时把场景概览发给 AI 提供剧情上下文 → 5. AI 返回每个角色的外貌
//   → 6. 按 ID 匹配写回角色 → 7. 序列化后存回数据库 → 8. 返回更新后的角色列表
func (s *ScriptService) GenerateCharacterAppearances(scriptID, userID, providerID string) ([]model.Character, error) {
	// ====== 第一步：查数据库，拿剧本 ======
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return nil, fmt.Errorf("剧本不存在: %w", err)
	}

	// ====== 第二步：解析角色 JSON（数据库里存的是 JSON 字节） ======
	var characters []model.Character
	if err := json.Unmarshal(script.Characters, &characters); err != nil {
		return nil, fmt.Errorf("解析角色数据失败: %w", err)
	}
	if len(characters) == 0 {
		return nil, fmt.Errorf("剧本中暂无角色")
	}

	// ====== 第三步：把角色转成 AI 需要的格式 ======
	// 只传必要字段（id/name/type/desc/role），不传全量
	charsForAI := make([]map[string]string, 0, len(characters))
	for _, ch := range characters {
		charsForAI = append(charsForAI, map[string]string{
			"id":   ch.ID,
			"name": ch.Name,
			"type": ch.Type,
			"desc": ch.Description,
			"role": ch.Arc, // 角色弧光/剧情作用
		})
	}
	charsJSON, _ := json.Marshal(charsForAI) // 序列化为 JSON 字符串发给 AI

	// ====== 第四步：提取每个场景的简要描述，作为 AI 的剧情上下文 ======
	// 让 AI 知道角色在什么剧情里出场，生成的外貌能贴合剧情
	var scenes []model.Scene
	json.Unmarshal(script.Scenes, &scenes)
	var sb strings.Builder
	for _, sc := range scenes {
		sb.WriteString(fmt.Sprintf("场景%d《%s》: ", sc.Sequence, sc.Title))
		for _, c := range sc.Content {
			// 只取每条 action 的描述，且截取前 60 个字符（控制在 token 范围内）
			if c.Type == "action" && len(c.Description) > 0 {
				if len([]rune(c.Description)) > 60 {
					sb.WriteString(string([]rune(c.Description)[:60]) + "…")
				} else {
					sb.WriteString(c.Description)
				}
				break // 每场取最短的一条 action 作为概括就够了
			}
		}
		sb.WriteString("\n")
	}

	// ====== 第五步：确定用哪个 AI 提供商，调用 AI 接口 ======
	cfg, _ := s.resolveProvider(providerID, userID)
	var results []map[string]string // AI 返回的格式: [{id: "角色ID", appearance: "外貌描述"}, ...]
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		// 用户指定了私有 API Key → 用自定义配置调用
		results, err = s.aiClient.GenerateCharacterAppearancesWithConfig(cfg, string(charsJSON), sb.String())
	} else {
		// 使用系统默认的 AI 提供商
		results, err = s.aiClient.GenerateCharacterAppearances(string(charsJSON), sb.String())
	}
	if err != nil {
		return nil, fmt.Errorf("AI 生成角色外貌失败: %w", err)
	}

	// ====== 第六步：把 AI 返回的结果按角色 ID 匹配回去 ======
	// AI 返回 [{id: "c1", appearance: "..."}, {id: "c2", appearance: "..."}]
	// 先建一个 id → appearance 的映射表
	appMap := make(map[string]string, len(results))
	for _, r := range results {
		appMap[r["id"]] = r["appearance"]
	}
	// 遍历原始角色列表，有外貌的就填上
	for i := range characters {
		if app, ok := appMap[characters[i].ID]; ok && app != "" {
			characters[i].Appearance = app
		}
	}

	// ====== 第七步：序列化并写回数据库 ======
	charsBytes, _ := json.Marshal(characters) // Character 结构体数组 → JSON 字节
	script.Characters = charsBytes            // 替换剧本里的角色字段
	if err := s.scriptRepo.Update(script); err != nil {
		return nil, fmt.Errorf("保存角色外貌失败: %w", err)
	}

	// ====== 第八步：返回更新后的角色列表（前端这里会用 listWorkScripts 重新拉取全量数据） ======
	return characters, nil
}

// GenerateSceneEnvironments 用 AI 生成场景环境/氛围描述并保存回剧本
func (s *ScriptService) GenerateSceneEnvironments(scriptID, userID, providerID string) ([]model.Scene, error) {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return nil, fmt.Errorf("剧本不存在: %w", err)
	}

	var scenes []model.Scene
	if err := json.Unmarshal(script.Scenes, &scenes); err != nil {
		return nil, fmt.Errorf("解析场景数据失败: %w", err)
	}
	if len(scenes) == 0 {
		return nil, fmt.Errorf("剧本中暂无场景")
	}

	scenesForAI := make([]map[string]string, 0, len(scenes))
	for _, sc := range scenes {
		scenesForAI = append(scenesForAI, map[string]string{
			"id":       sc.ID,
			"title":    sc.Title,
			"location": sc.Slugline.Name,
			"type":     sc.Slugline.Type,
			"time":     sc.Slugline.Time,
		})
	}
	scenesJSON, _ := json.Marshal(scenesForAI)

	cfg, _ := s.resolveProvider(providerID, userID)
	var results []map[string]string
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		results, err = s.aiClient.GenerateSceneEnvironmentsWithConfig(cfg, string(scenesJSON))
	} else {
		results, err = s.aiClient.GenerateSceneEnvironments(string(scenesJSON))
	}
	if err != nil {
		return nil, fmt.Errorf("AI 生成场景环境失败: %w", err)
	}

	envMap := make(map[string]string, len(results))
	for _, r := range results {
		envMap[r["id"]] = r["environment"]
	}
	for i := range scenes {
		if env, ok := envMap[scenes[i].ID]; ok && env != "" {
			scenes[i].Mood = env
		}
	}

	scenesBytes, _ := json.Marshal(scenes)
	script.Scenes = scenesBytes
	if err := s.scriptRepo.Update(script); err != nil {
		return nil, fmt.Errorf("保存场景环境失败: %w", err)
	}

	return scenes, nil
}
