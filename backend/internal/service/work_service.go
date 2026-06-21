package service

import (
	"encoding/json"
	"fmt"
	"log"
	"scriptsmith/internal/ai"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"
	"strings"
)

// WorkService 作品级业务逻辑层
// 负责跨剧集收集数据、调 AI、写回数据库等作品级别的操作
type WorkService struct {
	workRepo     *repository.WorkRepository
	scriptRepo   *repository.ScriptRepository
	providerRepo *repository.AIProviderRepository
	aiClient     *ai.Client
}

// NewWorkService 构造函数
func NewWorkService(
	workRepo *repository.WorkRepository,
	scriptRepo *repository.ScriptRepository,
	providerRepo *repository.AIProviderRepository,
	aiClient *ai.Client,
) *WorkService {
	return &WorkService{
		workRepo:     workRepo,
		scriptRepo:   scriptRepo,
		providerRepo: providerRepo,
		aiClient:     aiClient,
	}
}

// resolveProvider 根据 providerID + userID 解析出 AI 调用配置
func (s *WorkService) resolveProvider(providerID, userID string) (ai.ProviderConfig, *model.AIProvider) {
	if providerID != "" && s.providerRepo != nil {
		if p, err := s.providerRepo.GetByID(providerID, userID); err == nil {
			return ai.ProviderConfig{
				APIKey:    p.APIKey,
				BaseURL:   p.BaseURL,
				Model:     p.Model,
				MaxTokens: p.MaxTokens,
				Name:      p.Name,
			}, p
		}
	}
	if userID != "" && s.providerRepo != nil {
		if p, err := s.providerRepo.GetDefault(userID); err == nil {
			return ai.ProviderConfig{
				APIKey:    p.APIKey,
				BaseURL:   p.BaseURL,
				Model:     p.Model,
				MaxTokens: p.MaxTokens,
				Name:      p.Name,
			}, p
		}
	}
	return ai.ProviderConfig{Name: "system-default"}, nil
}

// charBrief 角色信息简表（用于喂给 AI）
type charBrief struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
	Desc string `json:"desc"`
	Arc  string `json:"arc"`
}

// loadProfiles 读取作品的角色小传列表（JSON 反序列化辅助）
func (s *WorkService) loadProfiles(work *model.Work) ([]model.CharacterProfile, error) {
	if len(work.CharacterProfiles) == 0 {
		return []model.CharacterProfile{}, nil
	}
	var profiles []model.CharacterProfile
	if err := json.Unmarshal(work.CharacterProfiles, &profiles); err != nil {
		return nil, err
	}
	return profiles, nil
}

// GenerateCharacterProfiles AI 根据作品下所有剧本的角色集合，生成人物小传
// 返回生成的角色小传列表，同时写回数据库
func (s *WorkService) GenerateCharacterProfiles(workID, userID, providerID string) ([]model.CharacterProfile, error) {
	// ====== 第一步：查作品 ======
	work, err := s.workRepo.Get(workID)
	if err != nil {
		return nil, fmt.Errorf("作品不存在: %w", err)
	}

	// ====== 第二步：收集该作品下所有剧集的所有角色（按名字去重） ======
	scripts, err := s.scriptRepo.ListByWorkID(workID)
	if err != nil {
		return nil, fmt.Errorf("读取剧本失败: %w", err)
	}

	charMap := make(map[string]charBrief)
	for _, sc := range scripts {
		var chars []model.Character
		if err := json.Unmarshal(sc.Characters, &chars); err != nil {
			continue
		}
		for _, ch := range chars {
			if ch.Name == "" {
				continue
			}
			if _, exists := charMap[ch.Name]; !exists {
				charMap[ch.Name] = charBrief{
					ID: ch.ID, Name: ch.Name, Type: ch.Type,
					Desc: ch.Description, Arc: ch.Arc,
				}
			}
		}
	}
	if len(charMap) == 0 {
		return nil, fmt.Errorf("该作品下暂无角色数据，请先转换剧本")
	}

	charList := make([]charBrief, 0, len(charMap))
	for _, v := range charMap {
		charList = append(charList, v)
	}
	charsJSON, _ := json.Marshal(charList)

	// ====== 第三步：构建剧情摘要（AI 的上下文） ======
	synopsis := work.Synopsis
	if synopsis == "" {
		synopsis = work.Summary
	}
	if synopsis == "" {
		var sb strings.Builder
		for _, sc := range scripts {
			if sc.Summary != "" {
				sb.WriteString(sc.Summary)
				sb.WriteString(" ")
			}
			if sb.Len() > 300 {
				break
			}
		}
		synopsis = sb.String()
		if synopsis == "" {
			synopsis = work.Title
		}
	}

	// ====== 第四步：确定 AI 提供商，调 AI 接口 ======
	cfg, _ := s.resolveProvider(providerID, userID)
	log.Printf("[work=%s] 开始 AI 生成角色设定 (%d 个角色, provider=%s)", workID, len(charList), cfg.Name)

	var results []map[string]string
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		results, err = s.aiClient.GenerateWorkCharacterProfilesWithConfig(cfg, string(charsJSON), synopsis)
	} else {
		results, err = s.aiClient.GenerateWorkCharacterProfiles(string(charsJSON), synopsis)
	}
	if err != nil {
		return nil, fmt.Errorf("AI 生成角色设定失败: %w", err)
	}

	// ====== 第五步：解析 AI 返回结果 → CharacterProfile 数组 ======
	profiles := make([]model.CharacterProfile, 0, len(results))
	for _, r := range results {
		profile := model.CharacterProfile{
			Name:        r["name"],
			Gender:      r["gender"],
			Appearance:  r["appearance"],
			Personality: r["personality"],
			Background:  r["background"],
			AvatarURL:   r["avatar_url"],
		}
		if profile.Name == "" {
			continue
		}
		profiles = append(profiles, profile)
	}

	// ====== 第六步：序列化并写回数据库 ======
	profilesJSON, _ := json.Marshal(profiles)
	work.CharacterProfiles = profilesJSON
	if err := s.workRepo.Update(work); err != nil {
		return nil, fmt.Errorf("保存角色设定失败: %w", err)
	}

	log.Printf("[work=%s] 角色设定已生成，共 %d 个角色", workID, len(profiles))
	return profiles, nil
}

// GenerateSingleCharacterBiography AI 为作品下的某个人物生成长文传记/评价
func (s *WorkService) GenerateSingleCharacterBiography(workID string, index int, userID, providerID string) (model.CharacterProfile, error) {
	// ====== 第一步：查作品 + 校验归属 ======
	work, err := s.workRepo.Get(workID)
	if err != nil {
		return model.CharacterProfile{}, fmt.Errorf("作品不存在: %w", err)
	}
	if work.UserID != userID {
		return model.CharacterProfile{}, fmt.Errorf("无权访问该作品")
	}

	// ====== 第二步：读取角色小传列表，校验索引 ======
	profiles, err := s.loadProfiles(work)
	if err != nil {
		return model.CharacterProfile{}, fmt.Errorf("解析角色设定失败: %w", err)
	}
	if index >= len(profiles) {
		return model.CharacterProfile{}, fmt.Errorf("该角色小传不存在")
	}
	profile := profiles[index]

	// ====== 第三步：构建剧情摘要 ======
	synopsis := work.Synopsis
	if synopsis == "" {
		synopsis = work.Summary
	}
	if synopsis == "" {
		synopsis = work.Title
	}

	// ====== 第四步：调 AI 生成传记 ======
	cfg, _ := s.resolveProvider(providerID, userID)
	log.Printf("[work=%s] 开始 AI 生成角色「%s」生平传记 (provider=%s)", workID, profile.Name, cfg.Name)

	var bio string
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		bio, err = s.aiClient.GenerateCharacterBiographyWithConfig(cfg,
			profile.Name, profile.Gender, profile.Appearance,
			profile.Personality, profile.Background, synopsis)
	} else {
		bio, err = s.aiClient.GenerateCharacterBiography(
			profile.Name, profile.Gender, profile.Appearance,
			profile.Personality, profile.Background, synopsis)
	}
	if err != nil {
		return model.CharacterProfile{}, fmt.Errorf("AI 生成失败: %w", err)
	}

	// ====== 第五步：写回数据库 ======
	profile.Biography = bio
	profiles[index] = profile
	profilesJSON, _ := json.Marshal(profiles)
	work.CharacterProfiles = profilesJSON
	if err := s.workRepo.Update(work); err != nil {
		return model.CharacterProfile{}, fmt.Errorf("保存人物小传失败: %w", err)
	}

	log.Printf("[work=%s] 角色「%s」生平传记已生成", workID, profile.Name)
	return profile, nil
}
