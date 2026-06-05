package repository

import (
	"encoding/json"
	"testing"

	"scriptsmith/internal/model"

	"gorm.io/datatypes"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Dialector{DSN: "file::memory:?cache=shared", DriverName: "sqlite"}, &gorm.Config{})
	if err != nil {
		t.Fatalf("无法连接测试数据库: %v", err)
	}
	if err := db.AutoMigrate(&model.Script{}); err != nil {
		t.Fatalf("迁移失败: %v", err)
	}
	return db
}

func TestScriptRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	repo := NewScriptRepository(db)

	metadata, _ := json.Marshal(model.Metadata{Title: "测试剧本", Format: "film"})
	characters, _ := json.Marshal([]model.Character{{ID: "c1", Name: "主角", Type: "protagonist"}})
	scenes, _ := json.Marshal([]model.Scene{{ID: "s1", Sequence: 1, Title: "开场"}})

	script := &model.Script{
		TaskID:     "task-1",
		Metadata:   datatypes.JSON(metadata),
		Characters: datatypes.JSON(characters),
		Scenes:     datatypes.JSON(scenes),
		Version:    1,
	}

	if err := repo.Create(script); err != nil {
		t.Fatalf("Create 失败: %v", err)
	}
	if script.ID == "" {
		t.Error("Create 后 ID 不应为空")
	}
}

func TestScriptRepository_Get(t *testing.T) {
	db := setupTestDB(t)
	repo := NewScriptRepository(db)

	script := &model.Script{TaskID: "task-2", Version: 1}
	if err := repo.Create(script); err != nil {
		t.Fatalf("Create 失败: %v", err)
	}

	got, err := repo.Get(script.ID)
	if err != nil {
		t.Fatalf("Get 失败: %v", err)
	}
	if got.ID != script.ID {
		t.Errorf("期望 ID %s, 得到 %s", script.ID, got.ID)
	}
	if got.TaskID != "task-2" {
		t.Errorf("期望 TaskID task-2, 得到 %s", got.TaskID)
	}
}

func TestScriptRepository_GetByTaskID(t *testing.T) {
	db := setupTestDB(t)
	repo := NewScriptRepository(db)

	script := &model.Script{TaskID: "task-3", Version: 1}
	if err := repo.Create(script); err != nil {
		t.Fatalf("Create 失败: %v", err)
	}

	got, err := repo.GetByTaskID("task-3")
	if err != nil {
		t.Fatalf("GetByTaskID 失败: %v", err)
	}
	if got.TaskID != "task-3" {
		t.Errorf("期望 TaskID task-3, 得到 %s", got.TaskID)
	}
}

func TestScriptRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	repo := NewScriptRepository(db)

	script := &model.Script{TaskID: "task-4", Version: 1}
	if err := repo.Create(script); err != nil {
		t.Fatalf("Create 失败: %v", err)
	}

	script.Version = 2
	if err := repo.Update(script); err != nil {
		t.Fatalf("Update 失败: %v", err)
	}

	got, err := repo.Get(script.ID)
	if err != nil {
		t.Fatalf("Get 失败: %v", err)
	}
	if got.Version != 2 {
		t.Errorf("期望 Version 2, 得到 %d", got.Version)
	}
}

func TestScriptRepository_Delete(t *testing.T) {
	db := setupTestDB(t)
	repo := NewScriptRepository(db)

	script := &model.Script{TaskID: "task-5", Version: 1}
	if err := repo.Create(script); err != nil {
		t.Fatalf("Create 失败: %v", err)
	}

	if err := repo.Delete(script.ID); err != nil {
		t.Fatalf("Delete 失败: %v", err)
	}

	_, err := repo.Get(script.ID)
	if err == nil {
		t.Error("删除后 Get 应返回错误")
	}
}

func TestScriptRepository_JSONBFields(t *testing.T) {
	db := setupTestDB(t)
	repo := NewScriptRepository(db)

	metadata, _ := json.Marshal(model.Metadata{
		Title:         "测试剧本",
		OriginalTitle: "原著",
		Format:        "film",
		Genre:         "动作",
	})
	characters, _ := json.Marshal([]model.Character{
		{ID: "c1", Name: "主角", Type: "protagonist", Description: "勇敢的战士"},
		{ID: "c2", Name: "反派", Type: "antagonist", Description: "狡猾的敌人"},
	})
	scenes, _ := json.Marshal([]model.Scene{
		{
			ID:       "s1",
			Sequence: 1,
			Title:    "开场",
			Slugline: model.Slugline{Type: "exterior", Name: "沙漠", Time: "day"},
			Content: []model.SceneContent{
				{ID: "sc1", Type: "action", Description: "主角策马奔腾"},
				{ID: "sc2", Type: "dialogue", CharacterID: "c1", CharacterName: "主角", Text: "驾！"},
			},
			CharactersPresent: []string{"c1"},
			Mood:              "紧张",
			Notes:             "远景拍摄",
		},
	})

	script := &model.Script{
		TaskID:     "task-6",
		Metadata:   datatypes.JSON(metadata),
		Characters: datatypes.JSON(characters),
		Scenes:     datatypes.JSON(scenes),
		YAML:       "title: 测试剧本",
		Version:    1,
	}

	if err := repo.Create(script); err != nil {
		t.Fatalf("Create 失败: %v", err)
	}

	got, err := repo.Get(script.ID)
	if err != nil {
		t.Fatalf("Get 失败: %v", err)
	}

	// 验证 Metadata JSON 可正确解析
	var meta model.Metadata
	if err := json.Unmarshal(got.Metadata, &meta); err != nil {
		t.Fatalf("Metadata 解析失败: %v", err)
	}
	if meta.Title != "测试剧本" {
		t.Errorf("期望 Title '测试剧本', 得到 '%s'", meta.Title)
	}

	// 验证 Characters JSON 可正确解析
	var chars []model.Character
	if err := json.Unmarshal(got.Characters, &chars); err != nil {
		t.Fatalf("Characters 解析失败: %v", err)
	}
	if len(chars) != 2 {
		t.Errorf("期望 2 个角色, 得到 %d", len(chars))
	}

	// 验证 Scenes JSON 可正确解析
	var scs []model.Scene
	if err := json.Unmarshal(got.Scenes, &scs); err != nil {
		t.Fatalf("Scenes 解析失败: %v", err)
	}
	if len(scs) != 1 {
		t.Errorf("期望 1 个场景, 得到 %d", len(scs))
	}
	if scs[0].Slugline.Name != "沙漠" {
		t.Errorf("期望地点 '沙漠', 得到 '%s'", scs[0].Slugline.Name)
	}

	// 验证 YAML 字段
	if got.YAML != "title: 测试剧本" {
		t.Errorf("YAML 不匹配")
	}
}
