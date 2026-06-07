# ScriptSmith YAML Schema 说明

ScriptSmith 导出剧本时使用标准 YAML 格式，兼容任何支持 YAML 的工具（制片软件、剧本编辑器、版本控制系统等）。

## 完整示例

```yaml
title: 射雕英雄传
original_title: 射雕英雄传
format: 电视剧
genre: 武侠
characters:
  - name: 郭靖
    type: protagonist
    description: 忠厚老实的大侠
    age: "18"
    gender: 男
    occupation: 侠客
    arc: 从懵懂少年成长为一代大侠
    appearance: 浓眉大眼，身材魁梧，面容坚毅
  - name: 黄蓉
    type: protagonist
    description: 聪明伶俐的少女
    age: "16"
    gender: 女
    occupation: 丐帮帮主
    arc: 从顽皮少女到成熟女性
    appearance: 明眸皓齿，灵动机敏，身材娇小
scenes:
  - sequence: 1
    title: 牛家村的少年
    slugline:
      type: exterior
      name: 牛家村
      time: day
    content:
      - type: action
        description: 阳光洒在牛家村的田野上，郭靖正在练武
      - type: dialogue
        character_name: 郭靖
        text: 师父，今天教我降龙十八掌吧！
        parenthetical: (兴奋地)
      - type: transition
        transition_type: CUT TO:
  - sequence: 2
    title: 桃花岛初见
    slugline:
      type: exterior
      name: 桃花岛海滩
      time: dawn
    content:
      - type: action
        description: 海雾弥漫，海浪轻拍沙滩
      - type: dialogue
        character_name: 黄蓉
        text: 你是谁？怎么会在桃花岛上？
      - type: sound
        sound_type: 环境音
        sound_description: 海浪声和鸟鸣
```

## 顶层结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 剧本标题 |
| `original_title` | string | 是 | 原著标题 |
| `format` | string | 是 | 剧本格式 |
| `genre` | string | 是 | 题材类型 |
| `characters` | array | 否 | 角色列表，无角色时不出现 |
| `scenes` | array | 否 | 场景列表，无场景时不出现 |

### format 可选值

| 值 | 含义 |
|----|------|
| `电影` | 电影剧本 |
| `电视剧` | 电视剧剧本 |
| `舞台剧` | 舞台剧剧本 |
| `动画` | 动画剧本 |
| `短片` | 短片剧本 |
| `网剧` | 网络剧剧本 |
| `纪录片` | 纪录片剧本 |

## characters 结构

数组中每个元素为一个角色：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 角色名 |
| `type` | enum | 是 | 角色类型 |
| `description` | string | 是 | 角色简介 |
| `age` | string | 否 | 年龄（空时不出现在 YAML 中） |
| `gender` | string | 否 | 性别 |
| `occupation` | string | 否 | 职业 |
| `arc` | string | 否 | 角色弧光（角色成长线） |
| `appearance` | string | 否 | AI 生成的相貌外貌描述 |

### type 可选值

| 值 | 含义 |
|----|------|
| `protagonist` | 主角 |
| `antagonist` | 反派 |
| `supporting` | 配角 |
| `extra` | 群众/龙套 |

## scenes 结构

数组中每个元素为一个场景：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sequence` | int | 是 | 场景序号，从 1 开始 |
| `title` | string | 是 | 场景标题 |
| `slugline` | object | 是 | 场景标题行 |
| `content` | array | 是 | 内容块列表 |

### slugline 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | enum | 是 | 场景类型 |
| `name` | string | 是 | 地点名称 |
| `time` | enum | 是 | 时间 |

**type 可选值**

| 值 | 含义 |
|----|------|
| `interior` | 内景 |
| `exterior` | 外景 |
| `both` | 内/外景 |

**time 可选值**

| 值 | 含义 |
|----|------|
| `day` | 日 |
| `night` | 夜 |
| `dawn` | 黎明/清晨 |
| `dusk` | 黄昏/傍晚 |
| `continuous` | 连续（与上一场景时间连续） |

## content 内容块

场景中的 `content` 数组包含不同类型的剧本元素，通过 `type` 字段区分：

### action — 动作描述

```yaml
- type: action
  description: 描述画面中发生的动作、环境、情绪等
```

| 字段 | 说明 |
|------|------|
| `type` | 固定值 `action` |
| `description` | 动作或画面描述文本 |

### dialogue — 对白

```yaml
- type: dialogue
  character_name: 角色名
  text: 台词内容
  parenthetical: (低声)   # 可选，表演提示
```

| 字段 | 说明 |
|------|------|
| `type` | 固定值 `dialogue` |
| `character_name` | 说话角色名 |
| `text` | 台词内容 |
| `parenthetical` | 表演提示（括号内容），可选 |

### transition — 转场

```yaml
- type: transition
  transition_type: CUT TO:
```

| 字段 | 说明 |
|------|------|
| `type` | 固定值 `transition` |
| `transition_type` | 转场类型，如 `CUT TO:`、`FADE OUT.` 等 |

### sound — 音效

```yaml
- type: sound
  sound_type: 环境音
  sound_description: 雨声淅沥，远处传来雷鸣
```

| 字段 | 说明 |
|------|------|
| `type` | 固定值 `sound` |
| `sound_type` | 音效类别（环境音、特效音等） |
| `sound_description` | 音效详细描述 |

### note — 备注

```yaml
- type: note
  description: 导演备注：此处需特写镜头
```

| 字段 | 说明 |
|------|------|
| `type` | 固定值 `note` |
| `description` | 备注内容 |

## 字段 omitempty 规则

标记为 `omitempty` 的字段在值为零值时不移出到 YAML：

| 字段 | 条件 |
|------|------|
| `characters` 数组 | 整体为空时不出现 |
| `scenes` 数组 | 整体为空时不出现 |
| `age` | 空字符串时不出现 |
| `gender` | 空字符串时不出现 |
| `occupation` | 空字符串时不出现 |
| `arc` | 空字符串时不出现 |
| `appearance` | 空字符串时不出现 |
| content 各可选字段 | 各字段为空时相应行不出现在 YAML 中 |

## JSON Schema

以下为导出 YAML 对应的 [JSON Schema](https://json-schema.org/) 定义，可用于校验和工具集成：

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://scriptsmith.dev/schema/script.yaml",
  "title": "ScriptSmith Script",
  "type": "object",
  "required": ["title", "original_title", "format", "genre"],
  "properties": {
    "title": { "type": "string" },
    "original_title": { "type": "string" },
    "format": { "type": "string" },
    "genre": { "type": "string" },
    "characters": {
      "type": "array",
      "items": { "$ref": "#/$defs/character" }
    },
    "scenes": {
      "type": "array",
      "items": { "$ref": "#/$defs/scene" }
    }
  },
  "$defs": {
    "character": {
      "type": "object",
      "required": ["name", "type", "description"],
      "properties": {
        "name": { "type": "string" },
        "type": { "enum": ["protagonist", "antagonist", "supporting", "extra"] },
        "description": { "type": "string" },
        "age": { "type": "string" },
        "gender": { "type": "string" },
        "occupation": { "type": "string" },
        "arc": { "type": "string" },
        "appearance": { "type": "string" }
      }
    },
    "scene": {
      "type": "object",
      "required": ["sequence", "title", "slugline", "content"],
      "properties": {
        "sequence": { "type": "integer", "minimum": 1 },
        "title": { "type": "string" },
        "slugline": {
          "type": "object",
          "required": ["type", "name", "time"],
          "properties": {
            "type": { "enum": ["interior", "exterior", "both"] },
            "name": { "type": "string" },
            "time": { "enum": ["day", "night", "dawn", "dusk", "continuous"] }
          }
        },
        "content": {
          "type": "array",
          "items": { "$ref": "#/$defs/content_block" }
        }
      }
    },
    "content_block": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "enum": ["action", "dialogue", "transition", "sound", "note"] },
        "description": { "type": "string" },
        "character_name": { "type": "string" },
        "text": { "type": "string" },
        "parenthetical": { "type": "string" },
        "transition_type": { "type": "string" },
        "sound_type": { "type": "string" },
        "sound_description": { "type": "string" }
      }
    }
  }
}
```
