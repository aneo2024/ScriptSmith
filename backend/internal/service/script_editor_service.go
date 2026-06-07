package service

import (
	"encoding/json"
	"fmt"
	"scriptsmith/internal/model"

	"github.com/google/uuid"
)

// UpdateScene 更新指定剧本中的某个场景
func (s *ScriptService) UpdateScene(scriptID, sceneID string, scene model.Scene) error {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return fmt.Errorf("剧本不存在: %w", err)
	}

	var scenes []model.Scene
	if err := json.Unmarshal(script.Scenes, &scenes); err != nil {
		return fmt.Errorf("解析场景数据失败: %w", err)
	}

	found := false
	for i := range scenes {
		if scenes[i].ID == sceneID {
			scenes[i] = scene
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("场景 %s 不存在", sceneID)
	}

	scenesJSON, err := json.Marshal(scenes)
	if err != nil {
		return fmt.Errorf("序列化场景失败: %w", err)
	}

	script.Scenes = scenesJSON
	return s.scriptRepo.Update(script)
}

// UpdateContent 更新指定剧本中的某个内容块
func (s *ScriptService) UpdateContent(scriptID, contentID string, content model.SceneContent) error {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return fmt.Errorf("剧本不存在: %w", err)
	}

	var scenes []model.Scene
	if err := json.Unmarshal(script.Scenes, &scenes); err != nil {
		return fmt.Errorf("解析场景数据失败: %w", err)
	}

	found := false
	for i := range scenes {
		for j := range scenes[i].Content {
			if scenes[i].Content[j].ID == contentID {
				scenes[i].Content[j] = content
				found = true
				break
			}
		}
		if found {
			break
		}
	}
	if !found {
		return fmt.Errorf("内容块 %s 不存在", contentID)
	}

	scenesJSON, err := json.Marshal(scenes)
	if err != nil {
		return fmt.Errorf("序列化场景失败: %w", err)
	}

	script.Scenes = scenesJSON
	return s.scriptRepo.Update(script)
}

// AddContent 向指定场景中添加内容块
func (s *ScriptService) AddContent(scriptID, sceneID string, content model.SceneContent) (*model.SceneContent, error) {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return nil, fmt.Errorf("剧本不存在: %w", err)
	}

	var scenes []model.Scene
	if err := json.Unmarshal(script.Scenes, &scenes); err != nil {
		return nil, fmt.Errorf("解析场景数据失败: %w", err)
	}

	found := false
	for i := range scenes {
		if scenes[i].ID == sceneID {
			if content.ID == "" {
				content.ID = uuid.New().String()
			}
			scenes[i].Content = append(scenes[i].Content, content)
			found = true
			break
		}
	}
	if !found {
		return nil, fmt.Errorf("场景 %s 不存在", sceneID)
	}

	scenesJSON, err := json.Marshal(scenes)
	if err != nil {
		return nil, fmt.Errorf("序列化场景失败: %w", err)
	}

	script.Scenes = scenesJSON
	if err := s.scriptRepo.Update(script); err != nil {
		return nil, fmt.Errorf("保存剧本失败: %w", err)
	}

	return &content, nil
}

// DeleteContent 删除指定内容块
func (s *ScriptService) DeleteContent(scriptID, contentID string) error {
	script, err := s.scriptRepo.Get(scriptID)
	if err != nil {
		return fmt.Errorf("剧本不存在: %w", err)
	}

	var scenes []model.Scene
	if err := json.Unmarshal(script.Scenes, &scenes); err != nil {
		return fmt.Errorf("解析场景数据失败: %w", err)
	}

	found := false
	for i := range scenes {
		for j := range scenes[i].Content {
			if scenes[i].Content[j].ID == contentID {
				scenes[i].Content = append(scenes[i].Content[:j], scenes[i].Content[j+1:]...)
				found = true
				break
			}
		}
		if found {
			break
		}
	}
	if !found {
		return fmt.Errorf("内容块 %s 不存在", contentID)
	}

	scenesJSON, err := json.Marshal(scenes)
	if err != nil {
		return fmt.Errorf("序列化场景失败: %w", err)
	}

	script.Scenes = scenesJSON
	return s.scriptRepo.Update(script)
}
