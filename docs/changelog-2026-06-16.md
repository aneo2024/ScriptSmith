# 6.16 日改动记录

## 1. UI 优化：角色年龄显示美化

**文件**：`frontend/src/pages/WorkListPage.jsx`

**问题**：角色年龄标签直接用空格拼接，显得突兀不美观。

**改动**：
- 将年龄和性别改为 Ant Design 的 `Tag` 组件显示
- 调整为两行布局：
  - 第一行：角色头像图标 + 角色名 + 年龄/性别标签
  - 第二行：字数统计 + 创建日期

---

## 2. Bug 修复：CreateWorkPage 状态重置

**文件**：`frontend/src/pages/CreateWorkPage.jsx`

**问题**：创建完成新作品后返回创作页面，仍显示上一次的数据。

**原因**：React 组件状态不会在页面导航回来时自动重置。

**改动**：添加 `useEffect`，在页面加载时强制重置所有状态：
```jsx
useEffect(() => {
  reset();
  setWorkTitle('');
  setSynopsis('');
  setNovelText('');
  setFormat(DEFAULT_FORMAT);
  setStyle(DEFAULT_STYLE);
  setCharacters([]);
  setExistingWork(null);
}, []);
```

---

## 3. 功能优化：角色信息同步策略

**文件**：`backend/internal/service/script_service.go`

**问题**：不同剧集的角色设定会互相覆盖，导致信息丢失。

**改动**：优化 `syncCharacters` 函数的同步策略：

| 信息类型 | 同步策略 | 原因 |
|---------|---------|------|
| 姓名 | 匹配键 | 唯一标识 |
| 性别 | 剧本→作品（填空） | 稳定不变 |
| 性格 | 剧本→作品（填空） | 基本稳定 |
| 背景 | 剧本→作品（填空） | 基本稳定 |
| **年龄** | **不同步** | 会随剧情时间线变化 |
| **外貌** | **不同步** | 可能随剧情发展变化 |

**核心原则**：
- 作品级设定存储稳定信息
- 剧本级角色存储当前集的具体表现

---

## 4. UI 优化：角色列表展开显示

**文件**：`frontend/src/pages/WorkDetailPage.jsx`

**问题**：展开角色列表后，类型标签（如"主角"）显示不美观。

**改动**：移除展开后的类型标签，只显示简介和外貌信息。

---

## 待优化项

### 5. 人物小传 AI 生成优化

**问题**：生成角色设定时，AI 只拿到角色名+类型+简介，没有角色在剧情中的实际表现。

**计划**：从剧本中提取每个角色的关键互动信息，只传给 AI 最有代表性的片段，控制 token 消耗。

### 6. 角色故事/独白功能

**计划**：用户可以点击角色卡片，生成该角色的故事/独白，增加代入感。

### 7. 角色关系图

**计划**：使用"规则提取 + AI 语义分析"的混合方案生成角色关系图。

---

## 讨论记录

### 关于 RAG

不需要使用 RAG。理由：
- 当前项目已有完整的剧本数据
- 只需要让 AI 做语义分析（关系类型判断）
- 规则提取（角色共现）零 token 消耗

### 关于长文本幻觉

- 当前已限制 50,000 字符
- 超过需要分段转换
- 分段的好处：避免幻觉、保持一致性、节省 token

### 关于不同集角色年龄不同

已解决：年龄不参与同步，每个剧本角色保留自己的年龄信息。

---

## 8. Bug 修复：登录错误提示不显示

**文件**：`frontend/src/services/api.js`、`frontend/src/pages/LoginPage.jsx`

**问题**：登录失败（用户名或密码错误）时页面无任何提示。

**根因**：三重问题叠加——

| 层级 | 问题 | 修复 |
|------|------|------|
| 拦截器 | `error.message = wrapped.message` 对 AxiosError 不生效（内部 getter 只读） | 新增 `error.serverMessage` 字段，用 `try/catch` 包裹赋值 |
| 消息组件 | antd v5 + `<AntdApp>` 包裹后，`message.error()` 被 context 隔离不显示 | 改用 `App.useApp()` 获取受控 message 实例 |
| 401 处理 | 登录失败 401 被拦截器进入 `clearAuthAndRedirect()` 分支，吞掉错误信息 | 对 `/login`、`/register`、`/refresh` 端点的 401 直接 `Promise.reject(error)` |

---

## 9. 新功能：改编备注（Adaptation Notes）

### 9.1 功能背景

**Prompt 层**：`promptTemplate.js` 要求 AI 在 `adaptation_notes` 中记录所有改编决策（合并角色原因、删减心理描写理由等）。

**后端存储层**：`model/script.go` 已有 `AdaptationNotes datatypes.JSON` 字段。

**缺失**：前端完全没有展示入口。

### 9.2 全链路实现

**前端核心组件**：
- 新建 `AdaptationNotes.jsx` — 章节分组 + 折叠面板展示
- 展示每条决策的 `改动` 和 `原因`（蓝色编辑图标 + 橙色灯泡图标）

**可选开关**（默认关闭，省 token）：
- `CreateWorkPage.jsx` — 改编风格下方新增 Switch「记录改编备注（增加 token 消耗）」
- 传给 `useTask.submit()` → `api.convertNovel()` → 后端 `include_notes` 字段

**后端条件化 prompt**：
- `ai/client.go` `buildStructuredPrompt` — 根据 `includeNotes` 决定是否包含 requirement 6 和 `adaptation_notes` JSON 字段
- 全链路透传：`handler → service → ai client`

### 9.3 UI 迭代过程

| 版本 | 方案 | 问题 |
|------|------|------|
| v1 | antd Table 表格 | 太丑，像数据报表 |
| v2 | 章节卡片 + 图标分段 | 白色底太厚重，占空间 |
| v3 | antd Collapse 折叠面板 | 改善但嵌入页面压迫布局 |
| v4 | antd Drawer 侧拉 | 嵌在页面边缘生硬，遮罩影响交互 |
| **v5** | **浮动拖拽面板** | 可拖动、半透明、不挡内容 |

**最终方案（v5）特性**：
- 浮动在画布右上角，`rgba(255,255,255,0.7)` 半透明
- 标题栏可拖拽移动
- 内层独立滚动，不阻断面板透明效果
- 场景标签自然换行，不截断
- 按钮放在工具栏，与「导出 YAML」「删除此集」并列

---

## 10. Bug 修复：CreateWorkPage 缺少影视类型选择器

**文件**：`frontend/src/pages/CreateWorkPage.jsx`

**问题**：`format` 状态、`formatOptions` 导入都存在，submit 也传了 `format`，但选择影视类型的 UI 不翼而飞。

**修复**：在人物小传下方、改编风格上方补回「影视类型」Select 下拉框（电影剧本/电视剧本/舞台剧/动画/短片/网剧/纪录片）。

---

## 11. 清理：删除未使用的 NovelInputPage

**文件**：`frontend/src/pages/NovelInputPage.jsx`（删除）、`frontend/src/App.jsx`

**原因**：NovelInputPage（`/novel-input` 路由）从未被使用。用户始终通过 CreateWorkPage（`/create-work`）创建剧本。

**改动**：
- 删除 `NovelInputPage.jsx` 文件
- 删除 `App.jsx` 中对应 import 和路由
- 删除 `scriptOptions.js` 中误加但不用的 GENRES 题材定义

---

## 12. 清理：Docker 环境残留容器

**问题**：`docker ps` 发现 `wizardly_hofstadter` 残留容器（Docker 自动命名的孤立 run）。

**修复**：`docker rm -f wizardly_hofstadter`，最终环境只剩三个容器：scriptsmith-nginx、scriptsmith-backend、scriptsmith-postgres。

---

## 涉及文件清单

| 文件 | 改动 |
|------|------|
| `frontend/src/services/api.js` | 401 拦截器修复 + serverMessage |
| `frontend/src/pages/LoginPage.jsx` | App.useApp() message |
| `frontend/src/components/AdaptationNotes.jsx` | 新建，折叠面板展示改编备注 |
| `frontend/src/pages/EditorPage.jsx` | 浮动拖拽面板 + 按钮位置 |
| `frontend/src/pages/CreateWorkPage.jsx` | Switch 开关 + 影视类型选择器 |
| `frontend/src/hooks/useTask.jsx` | includeNotes 参数透传 |
| `frontend/src/utils/scriptOptions.js` | 清理 GENRES |
| `frontend/src/App.jsx` | 删除 NovelInputPage 路由 |
| `frontend/src/pages/NovelInputPage.jsx` | 删除 |
| `backend/internal/handler/script_handler.go` | ConvertRequest.IncludeNotes |
| `backend/internal/service/script_service.go` | includeNotes 全链路透传 |
| `backend/internal/ai/client.go` | buildStructuredPrompt 条件化 |
| `backend/internal/model/script.go` | AdaptationNotes JSON 字段 |
