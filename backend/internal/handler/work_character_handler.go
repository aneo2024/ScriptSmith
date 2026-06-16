package handler

import (
	"encoding/json"
	"log"
	"scriptsmith/internal/ai"
	"scriptsmith/internal/model"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// 角色信息简表（用于喂给 AI）
type charBrief struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
	Desc string `json:"desc"`
	Arc  string `json:"arc"`
}

// resolveProvider 解析请求中指定的 provider（优先 user default）
func (h *WorkHandler) resolveProvider(userID string, bodyProviderID string) ai.ProviderConfig {
	cfg := ai.ProviderConfig{Name: "system-default"}
	if bodyProviderID != "" && h.providerRepo != nil {
		if p, err := h.providerRepo.GetByID(bodyProviderID, userID); err == nil {
			return ai.ProviderConfig{APIKey: p.APIKey, BaseURL: p.BaseURL, Model: p.Model, MaxTokens: p.MaxTokens, Name: p.Name}
		}
	}
	if cfg.APIKey == "" && h.providerRepo != nil {
		if p, err := h.providerRepo.GetDefault(userID); err == nil {
			return ai.ProviderConfig{APIKey: p.APIKey, BaseURL: p.BaseURL, Model: p.Model, MaxTokens: p.MaxTokens, Name: p.Name}
		}
	}
	return cfg
}

// loadProfiles 读取作品的角色小传列表
func (h *WorkHandler) loadProfiles(work *model.Work) ([]model.CharacterProfile, error) {
	if len(work.CharacterProfiles) == 0 {
		return []model.CharacterProfile{}, nil
	}
	var profiles []model.CharacterProfile
	if err := json.Unmarshal(work.CharacterProfiles, &profiles); err != nil {
		return nil, err
	}
	return profiles, nil
}

// GenerateCharacterProfiles AI 根据作品下所有剧本的角色，生成人物小传（长相、性格、背景）
// POST /v1/works/:id/characters/profiles
func (h *WorkHandler) GenerateCharacterProfiles(c *gin.Context) {
	workID := c.Param("id")
	userID := c.GetString("userID")

	work, err := h.workRepo.Get(workID)
	if err != nil {
		ErrorNotFound(c, "作品不存在")
		return
	}

	// 收集该作品下所有剧本的所有角色
	scripts, err := h.scriptRepo.ListByWorkID(workID)
	if err != nil {
		ErrorInternal(c, "读取剧本失败: "+err.Error())
		return
	}

	charMap := make(map[string]charBrief)
	for _, s := range scripts {
		var chars []model.Character
		if err := json.Unmarshal(s.Characters, &chars); err != nil {
			continue
		}
		for _, ch := range chars {
			if ch.Name == "" {
				continue
			}
			if _, exists := charMap[ch.Name]; !exists {
				charMap[ch.Name] = charBrief{ID: ch.ID, Name: ch.Name, Type: ch.Type, Desc: ch.Description, Arc: ch.Arc}
			}
		}
	}
	if len(charMap) == 0 {
		ErrorBadRequest(c, "该作品下暂无角色数据，请先转换剧本")
		return
	}

	charList := make([]charBrief, 0, len(charMap))
	for _, v := range charMap {
		charList = append(charList, v)
	}
	charsJSON, _ := json.Marshal(charList)

	// 解析 provider
	var body struct {
		ProviderID string `json:"provider_id"`
	}
	_ = c.ShouldBindJSON(&body)
	cfg := h.resolveProvider(userID, body.ProviderID)

	// 构建剧情摘要
	synopsis := work.Synopsis
	if synopsis == "" {
		synopsis = work.Summary
	}
	if synopsis == "" {
		var sb strings.Builder
		for _, s := range scripts {
			if s.Summary != "" {
				sb.WriteString(s.Summary)
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

	log.Printf("[work=%s] 开始 AI 生成角色设定 (%d 个角色, provider=%s)", workID, len(charList), cfg.Name)
	var results []map[string]string
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		results, err = h.aiClient.GenerateWorkCharacterProfilesWithConfig(cfg, string(charsJSON), synopsis)
	} else {
		results, err = h.aiClient.GenerateWorkCharacterProfiles(string(charsJSON), synopsis)
	}
	if err != nil {
		log.Printf("[work=%s] AI 生成角色设定失败: %v", workID, err)
		ErrorInternal(c, "AI 生成角色设定失败: "+err.Error())
		return
	}

	// 合并结果到 CharacterProfile 数组
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

	profilesJSON, _ := json.Marshal(profiles)
	work.CharacterProfiles = profilesJSON
	if err := h.workRepo.Update(work); err != nil {
		ErrorInternal(c, "保存角色设定失败: "+err.Error())
		return
	}

	log.Printf("[work=%s] 角色设定已生成，共 %d 个角色", workID, len(profiles))
	OK(c, gin.H{"profiles": profiles})
}

// GenerateSingleCharacterBiography AI 为作品下的某个人物生成长文传记/评价
// POST /v1/works/:id/characters/:index/biography
func (h *WorkHandler) GenerateSingleCharacterBiography(c *gin.Context) {
	workID := c.Param("id")
	indexStr := c.Param("index")
	userID := c.GetString("userID")

	index, err := strconv.Atoi(indexStr)
	if err != nil || index < 0 {
		ErrorBadRequest(c, "无效的角色索引")
		return
	}

	work, err := h.workRepo.Get(workID)
	if err != nil {
		ErrorNotFound(c, "作品不存在")
		return
	}
	if work.UserID != userID {
		ErrorForbidden(c, "无权访问该作品")
		return
	}

	profiles, err := h.loadProfiles(work)
	if err != nil {
		ErrorInternal(c, "解析角色设定失败: "+err.Error())
		return
	}
	if index >= len(profiles) {
		ErrorNotFound(c, "该角色小传不存在")
		return
	}
	profile := profiles[index]

	var body struct {
		ProviderID string `json:"provider_id"`
	}
	_ = c.ShouldBindJSON(&body)
	cfg := h.resolveProvider(userID, body.ProviderID)

	synopsis := work.Synopsis
	if synopsis == "" {
		synopsis = work.Summary
	}
	if synopsis == "" {
		synopsis = work.Title
	}

	log.Printf("[work=%s] 开始 AI 生成角色「%s」生平传记 (provider=%s)", workID, profile.Name, cfg.Name)
	var bio string
	if cfg.APIKey != "" && cfg.Name != "system-default" {
		bio, err = h.aiClient.GenerateCharacterBiographyWithConfig(cfg, profile.Name, profile.Gender, profile.Appearance, profile.Personality, profile.Background, synopsis)
	} else {
		bio, err = h.aiClient.GenerateCharacterBiography(profile.Name, profile.Gender, profile.Appearance, profile.Personality, profile.Background, synopsis)
	}
	if err != nil {
		log.Printf("[work=%s] AI 生成人物传记失败: %v", workID, err)
		ErrorInternal(c, "AI 生成失败: "+err.Error())
		return
	}

	profile.Biography = bio
	profiles[index] = profile
	profilesJSON, _ := json.Marshal(profiles)
	work.CharacterProfiles = profilesJSON
	if err := h.workRepo.Update(work); err != nil {
		ErrorInternal(c, "保存人物小传失败: "+err.Error())
		return
	}

	log.Printf("[work=%s] 角色「%s」生平传记已生成", workID, profile.Name)
	OK(c, gin.H{"profile": profile})
}

// UpdateCharacterProfile 手动更新单个人物小传（性格/外貌/背景/生平）
// PUT /v1/works/:id/characters/:index
func (h *WorkHandler) UpdateCharacterProfile(c *gin.Context) {
	workID := c.Param("id")
	indexStr := c.Param("index")
	userID := c.GetString("userID")

	index, err := strconv.Atoi(indexStr)
	if err != nil || index < 0 {
		ErrorBadRequest(c, "无效的角色索引")
		return
	}

	work, err := h.workRepo.Get(workID)
	if err != nil {
		ErrorNotFound(c, "作品不存在")
		return
	}
	if work.UserID != userID {
		ErrorForbidden(c, "无权访问该作品")
		return
	}

	profiles, err := h.loadProfiles(work)
	if err != nil {
		ErrorInternal(c, "解析角色设定失败: "+err.Error())
		return
	}
	if index >= len(profiles) {
		ErrorNotFound(c, "该角色小传不存在")
		return
	}

	var body struct {
		Appearance  *string `json:"appearance"`
		Personality *string `json:"personality"`
		Background  *string `json:"background"`
		Biography   *string `json:"biography"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		ErrorBadRequest(c, err.Error())
		return
	}

	if body.Appearance != nil {
		profiles[index].Appearance = *body.Appearance
	}
	if body.Personality != nil {
		profiles[index].Personality = *body.Personality
	}
	if body.Background != nil {
		profiles[index].Background = *body.Background
	}
	if body.Biography != nil {
		profiles[index].Biography = *body.Biography
	}

	profilesJSON, _ := json.Marshal(profiles)
	work.CharacterProfiles = profilesJSON
	if err := h.workRepo.Update(work); err != nil {
		ErrorInternal(c, "保存人物小传失败: "+err.Error())
		return
	}

	OK(c, gin.H{"profile": profiles[index]})
}
