package handler

import (
	"encoding/json"
	"scriptsmith/internal/model"
	"strconv"

	"github.com/gin-gonic/gin"
)

// loadProfiles 读取作品的角色小传列表（JSON 反序列化辅助）
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

	var body struct {
		ProviderID string `json:"provider_id"`
	}
	_ = c.ShouldBindJSON(&body)

	profiles, err := h.svc.GenerateCharacterProfiles(workID, userID, body.ProviderID)
	if err != nil {
		switch {
		case err.Error() == "该作品下暂无角色数据，请先转换剧本":
			ErrorBadRequest(c, err.Error())
		default:
			ErrorInternal(c, err.Error())
		}
		return
	}

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

	var body struct {
		ProviderID string `json:"provider_id"`
	}
	_ = c.ShouldBindJSON(&body)

	profile, err := h.svc.GenerateSingleCharacterBiography(workID, index, userID, body.ProviderID)
	if err != nil {
		switch {
		case err.Error() == "无权访问该作品" || err.Error() == "该角色小传不存在":
			ErrorNotFound(c, err.Error())
		default:
			ErrorInternal(c, err.Error())
		}
		return
	}

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
