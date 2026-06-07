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
func (s *ScriptService) GenerateCharacterAppearances(scriptID, userID, providerID string) ([]model.Character, error) {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return nil, fmt.Errorf("剧本不存在: %w", err)
	}

	var characters []model.Character
	if err := json.Unmarshal(script.Characters, &characters); err != nil {
		return nil, fmt.Errorf("解析角色数据失败: %w", err)
	}
	if len(characters) == 0 {
		return nil, fmt.Errorf("剧本中暂无角色")
	}

	charsForAI := make([]map[string]string, 0, len(characters))
	for _, ch := range characters {
		charsForAI = append(charsForAI, map[string]string{
			"id":   ch.ID,
			"name": ch.Name,
			"type": ch.Type,
			"desc": ch.Description,
			"role": ch.Arc,
		})
	}
	charsJSON, _ := json.Marshal(charsForAI)

	var scenes []model.Scene
	json.Unmarshal(script.Scenes, &scenes)
	var sb strings.Builder
	for _, sc := range scenes {
		sb.WriteString(fmt.Sprintf("场景%d《%s》: ", sc.Sequence, sc.Title))
		for _, c := range sc.Content {
			if c.Type == "action" && len(c.Description) > 0 {
				sb.WriteString(string([]rune(c.Description)))
				if len([]rune(c.Description)) > 60 {
					sb.WriteString(string([]rune(c.Description)[:60]) + "…")
				} else {
					sb.WriteString(c.Description)
				}
				break
			}
		}
		sb.WriteString("\n")
	}

	cfg, _ := s.resolveProvider(providerID, userID)
	var results []map[string]string
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		results, err = s.aiClient.GenerateCharacterAppearancesWithConfig(cfg, string(charsJSON), sb.String())
	} else {
		results, err = s.aiClient.GenerateCharacterAppearances(string(charsJSON), sb.String())
	}
	if err != nil {
		return nil, fmt.Errorf("AI 生成角色外貌失败: %w", err)
	}

	appMap := make(map[string]string, len(results))
	for _, r := range results {
		appMap[r["id"]] = r["appearance"]
	}
	for i := range characters {
		if app, ok := appMap[characters[i].ID]; ok && app != "" {
			characters[i].Appearance = app
		}
	}

	charsBytes, _ := json.Marshal(characters)
	script.Characters = charsBytes
	if err := s.scriptRepo.Update(script); err != nil {
		return nil, fmt.Errorf("保存角色外貌失败: %w", err)
	}

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
