package service

import (
	"encoding/json"
	"fmt"
	"scriptsmith/internal/model"
	"strings"

	"gopkg.in/yaml.v3"
)

// ExportYAML 将结构化剧本导出为标准剧本 YAML
func (s *ScriptService) ExportYAML(scriptID, userID, role string) (string, error) {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return "", fmt.Errorf("剧本不存在: %w", err)
	}
	return s.scriptToYAML(script)
}

// ExportYAMLByTaskID 按 taskID 导出 YAML
func (s *ScriptService) ExportYAMLByTaskID(taskID string) (string, error) {
	script, err := s.scriptRepo.GetByTaskID(taskID)
	if err != nil {
		return "", fmt.Errorf("剧本不存在: %w", err)
	}
	return s.scriptToYAML(script)
}

// scriptToYAML 将 Script 结构体转换为格式化的 YAML 字符串
func (s *ScriptService) scriptToYAML(script *model.Script) (string, error) {
	var meta model.Metadata
	if err := json.Unmarshal(script.Metadata, &meta); err != nil {
		return "", fmt.Errorf("解析剧本元数据失败: %w", err)
	}

	var chars []model.Character
	if len(script.Characters) > 0 && string(script.Characters) != "null" {
		if err := json.Unmarshal(script.Characters, &chars); err != nil {
			return "", fmt.Errorf("解析角色数据失败: %w", err)
		}
	}

	var scenes []model.Scene
	if len(script.Scenes) > 0 && string(script.Scenes) != "null" {
		if err := json.Unmarshal(script.Scenes, &scenes); err != nil {
			return "", fmt.Errorf("解析场景数据失败: %w", err)
		}
	}

	type sluglineYAML struct {
		Type string `yaml:"type"`
		Name string `yaml:"name"`
		Time string `yaml:"time"`
	}

	type contentLineYAML struct {
		Type           string `yaml:"type,omitempty"`
		Description    string `yaml:"description,omitempty"`
		CharacterName  string `yaml:"character_name,omitempty"`
		Text           string `yaml:"text,omitempty"`
		Parenthetical  string `yaml:"parenthetical,omitempty"`
		TransitionType string `yaml:"transition_type,omitempty"`
		SoundType      string `yaml:"sound_type,omitempty"`
		SoundDesc      string `yaml:"sound_description,omitempty"`
	}

	type sceneYAML struct {
		Sequence int               `yaml:"sequence"`
		Title    string            `yaml:"title"`
		Slugline sluglineYAML      `yaml:"slugline"`
		Content  []contentLineYAML `yaml:"content"`
	}

	doc := map[string]interface{}{
		"title":          meta.Title,
		"original_title": meta.OriginalTitle,
		"format":         meta.Format,
		"genre":          meta.Genre,
	}

	if len(chars) > 0 {
		doc["characters"] = chars
	}

	if len(scenes) > 0 {
		sceneList := make([]sceneYAML, len(scenes))
		for i, sc := range scenes {
			sy := sceneYAML{
				Sequence: sc.Sequence,
				Title:    sc.Title,
				Slugline: sluglineYAML{
					Type: sc.Slugline.Type,
					Name: sc.Slugline.Name,
					Time: sc.Slugline.Time,
				},
			}
			for _, c := range sc.Content {
				sy.Content = append(sy.Content, contentLineYAML{
					Type:           c.Type,
					Description:    c.Description,
					CharacterName:  c.CharacterName,
					Text:           c.Text,
					Parenthetical:  c.Parenthetical,
					TransitionType: c.TransitionType,
					SoundType:      c.SoundType,
					SoundDesc:      c.SoundDescription,
				})
			}
			sceneList[i] = sy
		}
		doc["scenes"] = sceneList
	}

	var buf strings.Builder
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	if err := enc.Encode(doc); err != nil {
		return "", fmt.Errorf("YAML 编码失败: %w", err)
	}

	return buf.String(), nil
}
