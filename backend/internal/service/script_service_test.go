package service

import (
	"encoding/json"
	"testing"

	"scriptsmith/internal/ai"
	"scriptsmith/internal/model"
	"scriptsmith/internal/repository"

	"gorm.io/datatypes"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	_ "modernc.org/sqlite"
)

func setupServiceTest(t *testing.T) (*ScriptService, *gorm.DB) {
	db, err := gorm.Open(sqlite.Dialector{DSN: "file::memory:?cache=shared", DriverName: "sqlite"}, &gorm.Config{})
	if err != nil {
		t.Fatalf("无法连接测试数据库: %v", err)
	}
	if err := db.AutoMigrate(&model.Script{}, &model.Task{}); err != nil {
		t.Fatalf("迁移失败: %v", err)
	}

	taskRepo := repository.NewTaskRepository(db)
	scriptRepo := repository.NewScriptRepository(db)
	svc := NewScriptService(taskRepo, scriptRepo, &ai.Client{})
	return svc, db
}

func createTestScript(t *testing.T, svc *ScriptService) *model.Script {
	scenes, _ := json.Marshal([]model.Scene{
		{
			ID:       "scene_1",
			Sequence: 1,
			Title:    "开场",
			Slugline: model.Slugline{Type: "interior", Name: "办公室", Time: "day"},
			Content: []model.SceneContent{
				{ID: "elem_1", Type: "action", Description: "主角走进办公室"},
				{ID: "elem_2", Type: "dialogue", CharacterID: "char_1", CharacterName: "张三", Text: "你好"},
			},
			CharactersPresent: []string{"char_1"},
		},
	})

	script := &model.Script{
		TaskID:     "task-test-1",
		Metadata:   datatypes.JSON(`{"title":"测试剧本","format":"film"}`),
		Characters: datatypes.JSON(`[{"id":"char_1","name":"张三","type":"protagonist"}]`),
		Scenes:     datatypes.JSON(scenes),
		Version:    1,
	}
	if err := svc.scriptRepo.Create(script); err != nil {
		t.Fatalf("Create 失败: %v", err)
	}
	return script
}

func TestUpdateScene(t *testing.T) {
	svc, _ := setupServiceTest(t)
	script := createTestScript(t, svc)

	updatedScene := model.Scene{
		ID:       "scene_1",
		Sequence: 1,
		Title:    "修改后的标题",
		Slugline: model.Slugline{Type: "exterior", Name: "街道", Time: "night"},
		Content: []model.SceneContent{
			{ID: "elem_1", Type: "action", Description: "主角走在街上"},
		},
		CharactersPresent: []string{"char_1"},
		Mood:              "紧张",
	}

	if err := svc.UpdateScene(script.ID, "scene_1", updatedScene); err != nil {
		t.Fatalf("UpdateScene 失败: %v", err)
	}

	// GET 验证
	got, err := svc.GetStructuredScript(script.ID)
	if err != nil {
		t.Fatalf("GetStructuredScript 失败: %v", err)
	}

	var scenes []model.Scene
	json.Unmarshal(got.Scenes, &scenes)
	if len(scenes) != 1 {
		t.Fatalf("期望 1 个场景, 得到 %d", len(scenes))
	}
	if scenes[0].Title != "修改后的标题" {
		t.Errorf("期望标题 '修改后的标题', 得到 '%s'", scenes[0].Title)
	}
	if scenes[0].Slugline.Name != "街道" {
		t.Errorf("期望地点 '街道', 得到 '%s'", scenes[0].Slugline.Name)
	}
}

func TestAddContent(t *testing.T) {
	svc, _ := setupServiceTest(t)
	script := createTestScript(t, svc)

	newContent := model.SceneContent{
		ID:            "elem_3",
		Type:          "dialogue",
		CharacterID:   "char_1",
		CharacterName: "张三",
		Text:          "新增的台词",
	}

	if err := svc.AddContent(script.ID, "scene_1", newContent); err != nil {
		t.Fatalf("AddContent 失败: %v", err)
	}

	got, _ := svc.GetStructuredScript(script.ID)
	var scenes []model.Scene
	json.Unmarshal(got.Scenes, &scenes)

	if len(scenes[0].Content) != 3 {
		t.Errorf("期望 3 个内容块, 得到 %d", len(scenes[0].Content))
	}
	if scenes[0].Content[2].Text != "新增的台词" {
		t.Errorf("期望台词 '新增的台词', 得到 '%s'", scenes[0].Content[2].Text)
	}
}

func TestDeleteContent(t *testing.T) {
	svc, _ := setupServiceTest(t)
	script := createTestScript(t, svc)

	if err := svc.DeleteContent(script.ID, "elem_1"); err != nil {
		t.Fatalf("DeleteContent 失败: %v", err)
	}

	got, _ := svc.GetStructuredScript(script.ID)
	var scenes []model.Scene
	json.Unmarshal(got.Scenes, &scenes)

	if len(scenes[0].Content) != 1 {
		t.Errorf("期望 1 个内容块, 得到 %d", len(scenes[0].Content))
	}
	if scenes[0].Content[0].ID != "elem_2" {
		t.Errorf("期望剩余 elem_2, 得到 %s", scenes[0].Content[0].ID)
	}
}

func TestGetScriptByParam(t *testing.T) {
	svc, _ := setupServiceTest(t)
	script := createTestScript(t, svc)

	// 按 script ID 查找
	got, err := svc.GetStructuredScript(script.ID)
	if err != nil {
		t.Fatalf("按 script ID 查找失败: %v", err)
	}
	if got.ID != script.ID {
		t.Errorf("期望 ID %s, 得到 %s", script.ID, got.ID)
	}

	// 按 task ID 查找
	got2, err := svc.GetScriptByTaskID(script.TaskID)
	if err != nil {
		t.Fatalf("按 task ID 查找失败: %v", err)
	}
	if got2.TaskID != script.TaskID {
		t.Errorf("期望 TaskID %s, 得到 %s", script.TaskID, got2.TaskID)
	}
}

func TestGetScriptReturnsFullJSON(t *testing.T) {
	svc, _ := setupServiceTest(t)
	script := createTestScript(t, svc)

	got, err := svc.GetStructuredScript(script.ID)
	if err != nil {
		t.Fatalf("GetStructuredScript 失败: %v", err)
	}

	// 验证 Characters 非空
	if len(got.Characters) == 0 || string(got.Characters) == "null" {
		t.Error("Characters 不应为空")
	}

	// 验证 Scenes 非空
	if len(got.Scenes) == 0 || string(got.Scenes) == "null" {
		t.Error("Scenes 不应为空")
	}

	// 验证 Metadata
	var meta model.Metadata
	json.Unmarshal(got.Metadata, &meta)
	if meta.Title != "测试剧本" {
		t.Errorf("期望标题 '测试剧本', 得到 '%s'", meta.Title)
	}
}
