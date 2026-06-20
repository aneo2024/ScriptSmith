# 6.20 日改动记录

## 1. Bug 修复：登录错误提示不显示

**文件**：`frontend/src/services/api.js`、`frontend/src/pages/LoginPage.jsx`

**问题**：登录失败（用户名或密码错误）时页面无任何提示。

**根因**：三重问题叠加——

| 层级     | 问题                                                                       | 修复                                                                         |
| -------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 拦截器   | `error.message = wrapped.message` 对 AxiosError 不生效（内部 getter 只读） | 新增 `error.serverMessage` 字段，用 `try/catch` 包裹赋值                     |
| 消息组件 | antd v5 + `<AntdApp>` 包裹后，`message.error()` 被 context 隔离不显示      | 改用 `App.useApp()` 获取受控 message 实例                                    |
| 401 处理 | 登录失败 401 被拦截器进入 `clearAuthAndRedirect()` 分支，吞掉错误信息      | 对 `/login`、`/register`、`/refresh` 端点的 401 直接 `Promise.reject(error)` |

---

## 2. 新功能：改编备注（Adaptation Notes）

### 2.1 功能背景

**Prompt 层**：`promptTemplate.js` 要求 AI 在 `adaptation_notes` 中记录所有改编决策（合并角色原因、删减心理描写理由等）。

**后端存储层**：`model/script.go` 已有 `AdaptationNotes datatypes.JSON` 字段。

**缺失**：前端完全没有展示入口。

### 2.2 全链路实现

**前端核心组件**：

- 新建 `AdaptationNotes.jsx` — 章节分组 + 折叠面板展示
- 展示每条决策的 `✏ 改动` 和 `💡 原因`

**可选开关**（默认关闭，省 token）：

- `CreateWorkPage.jsx` — 改编风格下方新增 Switch「记录改编备注（增加 token 消耗）」
- 传给 `useTask.submit()` → `api.convertNovel()` → 后端 `include_notes` 字段

**后端条件化 prompt**：

- `ai/client.go` `buildStructuredPrompt` — 根据 `includeNotes` 决定是否包含 requirement 6 和 `adaptation_notes` JSON 字段
- 全链路透传：`handler → service → ai client`

### 2.3 UI 迭代过程

| 版本   | 方案                   | 问题                     |
| ------ | ---------------------- | ------------------------ |
| v1     | antd Table 表格        | 太丑，像数据报表         |
| v2     | 章节卡片 + 图标分段    | 白色底太厚重，占空间     |
| v3     | antd Collapse 折叠面板 | 改善但嵌入页面压迫布局   |
| v4     | antd Drawer 侧拉       | 嵌在页面边缘生硬         |
| **v5** | **浮动拖拽面板**       | 可拖动、半透明、不挡内容 |

**最终方案（v5）特性**：

- 浮动在画布右上角，`rgba(255,255,255,0.7)` 半透明
- 标题栏可拖拽移动
- 内层独立滚动，不阻断面板透明效果
- 场景标签自然换行，不截断
- 按钮放在工具栏，与「导出 YAML」「删除此集」并列

---

## 3. Bug 修复：CreateWorkPage 缺少影视类型选择器

**文件**：`frontend/src/pages/CreateWorkPage.jsx`

**问题**：`format` 状态、`formatOptions` 导入都存在，submit 也传了 `format`，但选择影视类型的 UI 不翼而飞。

**修复**：在人物小传下方、改编风格上方补回「影视类型」Select 下拉框（电影剧本/电视剧本/舞台剧/动画/短片/网剧/纪录片）。

---

## 4. 清理：删除未使用的 NovelInputPage

**文件**：`frontend/src/pages/NovelInputPage.jsx`（删除）、`frontend/src/App.jsx`

**原因**：NovelInputPage（`/novel-input` 路由）从未被使用。用户始终通过 CreateWorkPage（`/create-work`）创建剧本。

**改动**：

- 删除 `NovelInputPage.jsx` 文件
- 删除 `App.jsx` 中对应 import 和路由
- 删除 `scriptOptions.js` 中误加但不用的 GENRES 题材定义

---

## 5. 清理：Docker 环境残留容器

**问题**：`docker ps` 发现 `wizardly_hofstadter` 残留容器（Docker 自动命名的孤立 run）。

**修复**：`docker rm -f wizardly_hofstadter`，最终环境只剩三个容器：scriptsmith-nginx、scriptsmith-backend、scriptsmith-postgres。

---

## 涉及文件清单

| 文件                                          | 改动                           |
| --------------------------------------------- | ------------------------------ |
| `frontend/src/services/api.js`                | 401 拦截器修复 + serverMessage |
| `frontend/src/pages/LoginPage.jsx`            | App.useApp() message           |
| `frontend/src/components/AdaptationNotes.jsx` | 新建，折叠面板展示改编备注     |
| `frontend/src/pages/EditorPage.jsx`           | 浮动拖拽面板 + 按钮位置        |
| `frontend/src/pages/CreateWorkPage.jsx`       | Switch 开关 + 影视类型选择器   |
| `frontend/src/hooks/useTask.jsx`              | includeNotes 参数透传          |
| `frontend/src/utils/scriptOptions.js`         | 清理 GENRES                    |
| `frontend/src/App.jsx`                        | 删除 NovelInputPage 路由       |
| `frontend/src/pages/NovelInputPage.jsx`       | 删除                           |
| `backend/internal/handler/script_handler.go`  | ConvertRequest.IncludeNotes    |
| `backend/internal/service/script_service.go`  | includeNotes 全链路透传        |
| `backend/internal/ai/client.go`               | buildStructuredPrompt 条件化   |
| `backend/internal/model/script.go`            | AdaptationNotes JSON 字段      |
