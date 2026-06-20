# ScriptSmith 剧本工作台与 AI 交互体验修复技术文档

> 文档版本：v1.0  
> 日期：2026-06-06  
> 涉及模块：后端 (Go) + 前端 (React)

---

## 目录

1. [问题背景](#1-问题背景)
2. [剧本工作台剧集切换与编辑入口缺失](#2-剧本工作台剧集切换与编辑入口缺失)
   - 2.1 只能编辑最新一集
   - 2.2 对白编辑缺少表演提示括号
3. [可视化编辑器交互可发现性](#3-可视化编辑器交互可发现性)
   - 3.1 场景内容编辑入口隐藏太深
4. [AI 生成流程无用户反馈](#4-ai-生成流程无用户反馈)
   - 4.1 生成文章无加载状态提示
   - 4.2 生成完成后需手动刷新页面
   - 4.3 生成请求超时被截断
5. [剧集一句话梗概缺失](#5-剧集一句话梗概缺失)
   - 5.1 summary 接口路由 404
   - 5.2 梗概 Tab 只有数据统计无内容摘要
6. [UI 冗余标签清理](#6-ui-冗余标签清理)
7. [API 响应格式统一化](#7-api-响应格式统一化)
   - 7.1 问题诊断
   - 7.2 后端改造
   - 7.3 前端改造
8. [测试验证](#8-测试验证)
9. [AI 交互模式：格式/风格扩展 + 角色外貌/场景环境生成](#9-ai-交互模式格式风格扩展--角色外貌场景环境生成)
   - 9.1 buildStructuredPrompt 缺少 format/style 参数
   - 9.2 extractJSON 不支持 JSON 数组 → 500 错误
   - 9.3 作品级角色设定 vs 剧本级角色装扮
   - 9.4 编译错误修复
   - 9.5 前端修复

---

## 1. 问题背景

**来源**：用户在实际操作剧本编辑流程中发现了一系列影响使用体验的问题，涵盖：

- 剧本工作台无法自由选择编辑目标剧集
- 可视化编辑器中场景内容的编辑功能难以发现
- AI 生成内容时缺少反馈，用户不知道系统是否在工作
- 剧集详情页缺少核心摘要信息
- 后端 API 响应格式混乱，前端调用和维护成本高

**修复目标**：

| 目标             | 描述                                              |
| ---------------- | ------------------------------------------------- |
| 剧集编辑入口统一 | 任意一集均可从详情页直接进入剧本工作台            |
| 编辑入口显式化   | 场景内容块增加常驻编辑图标，降低发现门槛          |
| AI 操作反馈完善  | 所有 AI 生成操作提供实时状态提示和无刷新更新      |
| 剧集摘要能力补齐 | 新增一句话梗概字段 + AI 自动生成接口              |
| API 响应统一     | 所有接口统一返回 `{success, code, message, data}` |

---

## 2. 剧本工作台剧集切换与编辑入口缺失

### 2.1 只能编辑最新一集

**文件**：[frontend/src/pages/WorkDetailPage.jsx](file:///f:/ScriptSmith/frontend/src/pages/WorkDetailPage.jsx)

#### 问题

从剧本列表进入作品详情页后，场景列表和角色管理旁边虽然有剧集 Tab 切换，但只有当前激活的剧集标签才有编辑入口。用户想编辑前几集的剧本时，无法直接跳转到对应集的剧本工作台。

#### 根因

原剧集 Tab 渲染只显示剧集名称，没有挂载跳转到编辑器的事件入口。

#### 修复

在每个剧集 Tab 标签文本旁增加编辑图标按钮（`EditOutlined`），点击后调用 `navigate(`/editor?workId=${workId}&scriptId=${script.id}`)` 跳转到该集的剧本可视化编辑器：

```jsx
// 修复后 — 每个剧集 Tab 都有编辑图标
items={episodes.map((ep) => ({
  key: ep.id,
  label: (
    <span>
      {ep.name}
      <Button
        type="text"
        size="small"
        icon={<EditOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/editor?workId=${workId}&scriptId=${ep.id}`);
        }}
      />
    </span>
  ),
}))}
```

**效果**：点击任意一集 Tab 旁的铅笔图标即可进入该集的剧本工作台，无需再切换到最新一集才能编辑。

---

### 2.2 对白编辑缺少表演提示括号

**文件**：

- [frontend/src/components/SceneCard.jsx](file:///f:/ScriptSmith/frontend/src/components/SceneCard.jsx)
- [frontend/src/styles/scene-card.css](file:///f:/ScriptSmith/frontend/src/styles/scene-card.css)

#### 问题

标准剧本格式中，角色名和台词之间有一个括号包裹的表演提示（如 `(激动地)`、`(低声)`），但在编辑对话内容块时，只能修改「角色名」和「台词」，中间的表演提示无法编辑。

#### 根因

对白编辑表单只有 `character`（角色名）和 `text`（台词）两个字段，`parenthetical`（表演提示）字段被遗漏。

#### 修复

在 ContentEdit 组件的对白编辑区域新增 `parenthetical` 输入框，放在角色名和台词之间：

```jsx
// 对白编辑区（角色名 + 表演提示 + 台词）
{
  content.type === "dialogue" && (
    <>
      <Input
        value={editCharacter}
        onChange={(e) => setEditCharacter(e.target.value)}
        placeholder="角色名"
        style={{ fontWeight: "bold", textAlign: "center" }}
      />
      <Input
        value={editParenthetical}
        onChange={(e) => setEditParenthetical(e.target.value)}
        placeholder="表演提示，如：激动地"
        style={{ fontStyle: "italic", color: "#888", textAlign: "center" }}
        className="parenthetical-input"
      />
      <Input.TextArea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        placeholder="台词内容"
        rows={2}
      />
    </>
  );
}
```

CSS 样式增强可发现性：

```css
.parenthetical-input {
  font-style: italic;
  color: #888;
  border: 1px dashed #d9d9d9;
}
.parenthetical-input:focus {
  border-color: #1677ff;
  color: #333;
}
```

**效果**：编辑对白时按角色名 → 表演提示 → 台词的顺序展示三个输入框，覆盖标准剧本格式的全部要素。

---

## 3. 可视化编辑器交互可发现性

### 3.1 场景内容编辑入口隐藏太深

**文件**：[frontend/src/components/SceneCard.jsx](file:///f:/ScriptSmith/frontend/src/components/SceneCard.jsx)

#### 问题

用户反馈"可视化界面编辑剧本的时候无法对场景进行修改"。实际上编辑功能本身已存在（双击标题或内容块进入编辑模式），但交互方式完全隐藏——没有图标、没有提示文字、没有悬停效果——用户根本不知道可以双击编辑。

#### 根因

编辑功能仅通过 `onDoubleClick` 事件触发，无任何视觉提示。对于非专业用户来说，这是典型的"可发现性"问题。

#### 修复

为所有可编辑元素增加常驻或悬停时显示的编辑图标：

**场景标题旁**：显示编辑图标，点击可修改场景名称

```jsx
<EditOutlined
  className="scene-edit-icon"
  onClick={() => startEdit("heading")}
/>
```

**场景地点/时间旁**：显示编辑图标，点击可修改地点和时间

```jsx
<EditOutlined
  className="scene-edit-icon"
  onClick={() => startEdit("location")}
/>
```

**内容块悬停**：每个对白/动作/转场行在鼠标悬停时显示编辑图标

```jsx
<div className="content-line" onMouseEnter={...} onMouseLeave={...}>
  <span className="content-text">...</span>
  {hovered && <EditOutlined onClick={() => startEdit('content', idx)} />}
</div>
```

同时保留原有的双击编辑方式作为快速操作的补充。

**效果**：用户无需猜测，看到编辑图标就知道可以点，符合常见文本编辑器的交互直觉。

---

## 4. AI 生成流程无用户反馈

### 4.1 生成文章无加载状态提示

**文件**：

- [frontend/src/pages/InspirationPage.jsx](file:///f:/ScriptSmith/frontend/src/pages/InspirationPage.jsx)
- [frontend/src/services/inspiration.js](file:///f:/ScriptSmith/frontend/src/services/inspiration.js)

#### 问题

在灵感广场页面，用户输入主题点击「生成」后，界面没有任何反馈。AI 调用可能持续 10-30 秒，用户不知道系统是否在工作，可能反复点击或误认为功能不可用。

#### 根因

前端调用 `generateArticle(topic)` 后没有展示任何 loading 状态，用户只能干等。

#### 修复

**三层加载反馈**：

**① 搜索按钮 loading**：Input.Search 的 `loading` 属性让搜索图标变为转圈

```jsx
<Input.Search loading={generating} onSearch={handleGenerate} />
```

**② 全屏加载弹窗**：

```jsx
<Modal
  open={generating}
  closable={false}
  maskClosable={false}
  footer={null}
  centered
>
  <div className="generate-loading">
    <Spin size="large" />
    <div className="stage-text">{stageText}</div>
    <div className="progress-bar">
      <div className="progress-fill" />
    </div>
    <div className="hint">这通常需要 10-30 秒</div>
  </div>
</Modal>
```

**③ 分阶段状态文字**：每 3 秒切换一次提示文字，模拟进度感

```js
const stages = [
  "正在连接 AI 引擎...",
  "正在分析主题：" + topic,
  "正在搜集剧本创作相关资料...",
  "AI 正在撰写文章...",
  "正在润色和排版...",
];
```

**效果**：用户点击生成后，搜索按钮转圈 → 全屏弹窗显示进度 → 分阶段文字告知当前状态 → 进度条流动动画，整个等待过程透明可见。

---

### 4.2 生成完成后需手动刷新页面

**文件**：[backend/internal/handler/inspiration_handler.go](file:///f:/ScriptSmith/backend/internal/handler/inspiration_handler.go)

#### 问题

AI 生成文章完成后，灵感广场的文章列表不会自动更新。用户必须手动刷新浏览器才能看到新生成的文章。

#### 根因

原 `GenerateArticle` handler 采用"异步生成"模式：

```go
// 原逻辑：立即返回，后台异步生成
go func() {
    content := ai.GenerateArticle(topic)
    repo.Create(article)
}()
c.JSON(200, gin.H{"message": "已提交生成任务，请稍后刷新"})
```

前端收到"请稍后刷新"提示后，没有轮询机制来获知文章何时生成完毕。

#### 修复

改为**同步等待**——AI 生成完成后直接保存并返回完整文章对象：

```go
// 修复后：同步等待 AI 完成，直接返回文章
content, err := h.ai.GenerateArticle(req.Topic)
if err != nil {
    ErrorInternal(c, "AI 生成失败: "+err.Error())
    return
}
article.Content = content
h.repo.Create(article)
OK(c, gin.H{"article": article, "topic": topic})
```

前端收到响应后直接将新文章插入列表顶部：

```js
const result = await generateArticle(topic);
setArticles((prev) => [result.article, ...prev]);
message.success("文章生成成功！");
```

**效果**：AI 生成完成后，文章自动出现在列表最顶部，无需手动刷新。弹窗自动关闭，话题榜同步刷新。

---

### 4.3 生成请求超时被截断

**文件**：[frontend/src/services/inspiration.js](file:///f:/ScriptSmith/frontend/src/services/inspiration.js)

#### 问题

AI 生成文章通常需要 10-30 秒，但 axios 默认超时为 10 秒。导致部分慢响应的生成请求在 AI 还在工作时就被前端截断，返回超时错误。

#### 根因

`generateArticle` 请求未自定义 `timeout`，继承 axios 实例的全局默认超时。

#### 修复

为生成请求单独设置 120 秒超时：

```js
// 变更前
export const generateArticle = (topic) =>
  api.post("/inspiration/generate", { topic }).then((r) => r.data);

// 变更后
export const generateArticle = (topic) =>
  api
    .post("/inspiration/generate", { topic }, { timeout: 120000 })
    .then((r) => r.data);
```

---

## 5. 剧集一句话梗概缺失

### 5.1 summary 接口路由 404

**文件**：[backend/cmd/server/main.go](file:///f:/ScriptSmith/backend/cmd/server/main.go)

#### 问题

[GIN] 日志连续输出 404：

```
POST "/v1/scripts/7b0a8a7e-b3a0-4fcd-9226-22a8ce1bd64d/summary" 404
POST "/v1/scripts/7b0a8a7e-b3a0-4fcd-9226-22a8ce1bd64d/summary" 404
POST "/v1/scripts/7b0a8a7e-b3a0-4fcd-9226-22a8ce1bd64d/summary" 404
```

#### 根因

`GenerateSummary` handler 和路由注册代码写在 `script_handler.go` 的 `RegisterRoutes()` 方法中，但 `main.go` 从未调用该方法。`main.go` 中所有路由都是逐条手写注册的：

```go
// main.go 中实际使用的路由注册方式
auth.POST("/convert", h.Convert)
auth.GET("/task/:id", h.GetTask)
// ... 没有 /scripts/:scriptID/summary 这条
```

新增的 `summary` 路由写在了 `RegisterRoutes()` 里，但因为该方法未被调用，路由永远不会生效。

#### 修复

直接在 `main.go` 的 auth 路由组中补上这行：

```go
auth.POST("/scripts/:scriptID/summary", h.GenerateSummary)
```

### 5.2 梗概 Tab 只有数据统计无内容摘要

**文件**：

- [backend/internal/model/script.go](file:///f:/ScriptSmith/backend/internal/model/script.go) — 模型
- [backend/internal/ai/client.go](file:///f:/ScriptSmith/backend/internal/ai/client.go) — AI Prompt
- [backend/internal/service/script_service.go](file:///f:/ScriptSmith/backend/internal/service/script_service.go) — 业务逻辑
- [frontend/src/pages/WorkDetailPage.jsx](file:///f:/ScriptSmith/frontend/src/pages/WorkDetailPage.jsx) — UI

#### 问题

作品详情页的「剧集梗概」Tab 只展示了场景数量、角色数量等数据统计卡片，缺少"这一集讲了什么"的一句话摘要。

#### 根因

`Script` 数据模型缺少 `Summary` 字段，也没有 AI 自动生成摘要的能力。

#### 修复

**后端三步走**：

**① 模型层** — `Script` 新增 `Summary` 字段

```go
type Script struct {
    // ... 原有字段
    Summary string `gorm:"type:text" json:"summary,omitempty"`
}
```

**② AI 层** — 新增 `GenerateScriptSummary` 方法

将场景数据（场景列表、角色对白摘要）构建为精简文本，发送给 AI 要求生成"用一句话概括本集剧情"。

```go
func (c *Client) GenerateScriptSummary(scriptData string) (string, error) {
    prompt := fmt.Sprintf(
        "你是一位专业编剧助手。请根据以下剧本场景数据，用一句话概括本集的剧情..."+
        "\n\n剧本数据：\n%s\n\n一句话梗概（不超过50字）：", scriptData,
    )
    return c.Chat(prompt)
}
```

**③ 服务层** — `GenerateSummary` 编排完整流程

```go
func (s *ScriptService) GenerateSummary(scriptID string) (string, error) {
    script, err := s.scriptRepo.GetByID(scriptID)
    // 构建场景数据摘要文本
    scriptData := buildScriptSummaryData(script)
    // 调用 AI
    summary, err := s.aiClient.GenerateScriptSummary(scriptData)
    // 保存到数据库
    script.Summary = summary
    s.scriptRepo.Save(script)
    return summary, nil
}
```

**前端 UI**：

在「剧集梗概」Tab 顶部新增一句话摘要卡片：

```jsx
<Card className="summary-card">
  <div className="summary-header">
    <BulbOutlined />
    <span>本集梗概</span>
    <Button loading={summaryLoading} onClick={handleGenerateSummary}>
      {script.summary ? "重新生成" : "AI 生成梗概"}
    </Button>
  </div>
  <div className="summary-content">
    {script.summary || "尚未生成梗概，点击按钮让 AI 自动生成一句话摘要"}
  </div>
</Card>
```

**效果**：

- 首次进入显示"尚未生成梗概"占位文字 + 蓝色生成按钮
- 点击按钮后进入 loading 状态
- AI 生成完成后，梗概文字直接渲染在卡片内，背景变绿
- 切换剧集时各自独立，梗概不混淆
- 可随时重新生成

---

## 6. UI 冗余标签清理

**文件**：[frontend/src/pages/WorkDetailPage.jsx](file:///f:/ScriptSmith/frontend/src/pages/WorkDetailPage.jsx)

#### 问题

进入一个作品详情页后，标题旁边显示「电影」标签（作品类型）和「草稿」标签（完成状态）。其中「草稿」标签对用户毫无意义——整个系统从未提供过把作品从 draft 改成其他状态的入口，所有作品永远都是草稿状态。

#### 修复

删除 `status` 标签的渲染代码，仅保留 `genre`（作品类型）标签。

```jsx
// 变更前
<Tag color="blue">{work.genre}</Tag>
<Tag>{work.status}</Tag>

// 变更后
<Tag color="blue">{work.genre}</Tag>
```

---

## 7. API 响应格式统一化

### 7.1 问题诊断

在排查 summary 路由 404 和前几轮 bug 修复过程中发现，项目后端 API 响应格式混乱：

| handler             | 成功返回格式                           | 错误返回格式     |
| ------------------- | -------------------------------------- | ---------------- |
| auth_handler        | `{token, user_id, username, role}`     | `{error: "xxx"}` |
| work_handler        | `{work: {...}}` 或 `[works]`           | `{error: "xxx"}` |
| script_handler      | `{script: {...}}` 或 `{scenes: [...]}` | `{error: "xxx"}` |
| inspiration_handler | `{articles: [...]}`                    | `{error: "xxx"}` |

前端每次调用 API 都要"猜测"返回字段名，代码中散布着 `r.data.work`、`r.data.scripts`、`r.data.articles` 等不同解包方式。错误处理也各自为政——有的检查 `r.data.error`，有的 catch axios error，有的直接 `message.error('失败')`。

### 7.2 后端改造

**新增文件**：[backend/internal/handler/response.go](file:///f:/ScriptSmith/backend/internal/handler/response.go)

**统一响应结构**

```go
type Response struct {
    Success bool        `json:"success"`
    Code    string      `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
}
```

**辅助函数（10 个）**：

| 函数                           | 用途                       | HTTP 状态码 |
| ------------------------------ | -------------------------- | ----------- |
| `OK(c, data)`                  | 通用成功                   | 200         |
| `Created(c, data)`             | 资源创建成功               | 201         |
| `ErrorBadRequest(c, msg)`      | 参数校验失败               | 400         |
| `ErrorUnauthorized(c, msg)`    | 未认证                     | 401         |
| `ErrorForbidden(c, msg)`       | 无权限                     | 403         |
| `ErrorNotFound(c, msg)`        | 资源不存在                 | 404         |
| `ErrorConflict(c, msg)`        | 资源冲突                   | 409         |
| `ErrorTooManyRequests(c, msg)` | 频率限制                   | 429         |
| `ErrorInternal(c, msg)`        | 服务器内部错误             | 500         |
| `rawJSON(c, status, data)`     | 内部辅助（非 JSON 响应用） | 自定义      |

**改造范围**：

逐函数将 4 个 handler 文件中的 `c.JSON(http.StatusXXX, gin.H{...})` 替换为辅助函数调用：

**变更前示例**：

```go
// auth_handler.go
c.JSON(http.StatusOK, gin.H{
    "token":    token,
    "user_id":  user.ID,
    "username": user.Username,
    "role":     user.Role,
})

// 错误处理
c.JSON(http.StatusBadRequest, gin.H{"error": "参数不合法"})
c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
c.JSON(http.StatusInternalServerError, gin.H{"error": "生成 Token 失败"})
```

**变更后示例**：

```go
// auth_handler.go — 成功
OK(c, gin.H{
    "token":        token,
    "refresh_token": refreshToken,
    "expires_in":   86400,
    "user_id":      user.ID,
    "username":     user.Username,
    "role":         user.Role,
})

// 错误处理
ErrorBadRequest(c, "参数不合法")
ErrorUnauthorized(c, "用户名或密码错误")
ErrorInternal(c, "生成 Token 失败")
```

**实际响应体变化**：

```json
// 变更前
{
  "token": "eyJhbGciOi...",
  "user_id": "abc123",
  "username": "alice",
  "role": "user"
}

// 变更后
{
  "success": true,
  "code": "ok",
  "message": "成功",
  "data": {
    "token": "eyJhbGciOi...",
    "user_id": "abc123",
    "username": "alice",
    "role": "user"
  }
}
```

**改造覆盖的 handler**：

| 文件                                                                                             | 改造方法数 | 说明                         |
| ------------------------------------------------------------------------------------------------ | ---------- | ---------------------------- |
| [auth_handler.go](file:///f:/ScriptSmith/backend/internal/handler/auth_handler.go)               | 4          | Register、Login、Refresh、Me |
| [work_handler.go](file:///f:/ScriptSmith/backend/internal/handler/work_handler.go)               | 8          | CRUD + 角色管理              |
| [script_handler.go](file:///f:/ScriptSmith/backend/internal/handler/script_handler.go)           | 12         | 剧本转换/编辑/导出           |
| [inspiration_handler.go](file:///f:/ScriptSmith/backend/internal/handler/inspiration_handler.go) | 8          | 灵感文章 + 话题管理          |

### 7.3 前端改造

**文件**：[frontend/src/services/api.js](file:///f:/ScriptSmith/frontend/src/services/api.js)

在响应拦截器中增加**透明解包**层，所有 `{success, data}` 格式的响应自动剥离外层包装：

```js
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    // 检测是否是统一响应格式
    if (body && typeof body === "object" && "success" in body) {
      if (body.success) {
        response.data = body.data ?? body; // 自动解包
      } else {
        const err = new Error(body.message || "请求失败");
        err.code = body.code;
        return Promise.reject(err); // 失败统一 reject
      }
    }
    return response;
  },
  // ... 401 刷新逻辑
);
```

**关键设计**：拦截器在 response 对象上原位替换 `response.data`，使得所有调用方（各 service 文件）无需做任何修改。原来 `.then(r => r.data)` 拿到的数据内容和改造前一模一样。

**refresh token 特殊处理**：refresh 请求使用原生 `axios`（不走 `api` 实例的拦截器），需手动解包：

```js
// 变更前
const data = res.data;
localStorage.setItem("token", data.token);

// 变更后
const body = res.data;
const data = body && body.success ? body.data : body;
localStorage.setItem("token", data.token);
```

**前端零改动原则**：所有 `services/*.js` 文件完全不需要修改，因为拦截器层面的透明解包保证了 `.then(r => r.data)` 的返回值和改造前一致。

---

## 8. 测试验证

| 测试项                | 验证方法                            | 预期结果                                              | 状态 |
| --------------------- | ----------------------------------- | ----------------------------------------------------- | ---- |
| 后端编译              | `cd backend && go build ./...`      | 无错误                                                | PASS |
| 前端编译              | `cd frontend && npm run build`      | 无错误                                                | PASS |
| 剧本工作台-任意集编辑 | 点第三集编辑图标                    | 跳转到第三集的编辑器                                  | PASS |
| 对白编辑-表演提示     | 点击对白行编辑→输表演提示→保存      | 表演提示显示在角色名和台词之间                        | PASS |
| 场景编辑-点击图标     | 悬停内容块→点编辑图标→修改→保存     | 内容更新                                              | PASS |
| AI 生成文章加载态     | 输入主题→点击生成                   | 弹出全屏加载弹窗+分阶段文字+进度条                    | PASS |
| AI 生成文章完成展示   | 等待生成完成                        | 弹窗关闭+文章出现在列表顶部                           | PASS |
| summary 路由可达      | `curl POST /v1/scripts/:id/summary` | 200 + summary 字段                                    | PASS |
| 剧集梗概-未生成状态   | 进入新增剧集的梗概 Tab              | 显示"尚未生成梗概"+ 生成按钮                          | PASS |
| 剧集梗概-AI 生成      | 点击「AI 生成梗概」                 | 按钮 loading→梗概文字渲染                             | PASS |
| 剧集梗概-切换剧集     | 切换不同剧集                        | 各自显示独立梗概                                      | PASS |
| 作品详情-无草稿标签   | 进入任意作品详情页                  | 只显示 genre 标签                                     | PASS |
| 统一响应-登录         | `POST /v1/auth/login`               | `{success, code, message, data:{token,...}}`          | PASS |
| 统一响应-错误         | 输入错误密码登录                    | `{success:false, code:"unauthorized", message:"..."}` | PASS |
| 前端透明解包          | 检查 `workService.list()` 返回值    | `.then(r => r.data)` 仍拿到 `{works:[...]}`           | PASS |
| 401 自动刷新          | 使用过期 token 发请求               | 自动刷新 token → 重试原请求成功                       | PASS |

---

## 9. AI 交互模式：格式/风格扩展 + 角色外貌/场景环境生成

> 日期：2026-06-06（同日补充）

### 9.1 buildStructuredPrompt 缺少 format/style 参数

**文件**：`backend/internal/ai/client.go`、`backend/internal/service/script_service.go`

#### 问题

`buildStructuredPrompt` 仅接收 `novelText`，未将用户在 NovelInputPage 选择的格式（电影/网剧/动画等）和风格（武侠风/悬疑惊悚/极简留白等）传给 AI。`processInBackground` 调用链中 `task.Format` 和 `task.Style` 被硬编码丢弃。

#### 修复

三处联动改动：

**① `buildStructuredPrompt` 加参数并注入提示词**：

```go
// 变更前
func buildStructuredPrompt(novelText string) string

// 变更后
func buildStructuredPrompt(novelText, format, style string) string
```

每种格式/风格对应一条中文提示词，如 `wuxia → "武侠风：江湖恩怨、武打场景、侠义精神"`，注入 Prompt 首部。

**② `ConvertNovelToStructured` 系列方法加参数**：

```go
func (c *Client) ConvertNovelToStructured(novelText, format, style string) (*model.Script, error)
func (c *Client) ConvertNovelToStructuredWithConfig(cfg ProviderConfig, novelText, format, style string) (*model.Script, error)
```

**③ `processInBackground` 透传 `task.Format` / `task.Style`**。

| 场景             | 修复前            | 修复后                    |
| ---------------- | ----------------- | ------------------------- |
| 用户选"武侠风"   | AI 按通用风格改编 | AI 理解武侠风格要求并体现 |
| 用户选"动画剧本" | AI 生成电影格式   | AI 按动画剧本格式生成     |

---

### 9.2 extractJSON 不支持 JSON 数组 → 500 错误

**文件**：`backend/internal/ai/client.go`

`GenerateCharacterAppearances`、`GenerateSceneEnvironments`、`GenerateWorkCharacterProfiles` 的 Prompt 要求 AI 返回 JSON 数组 `[{...}]`。但 `extractJSON` 只查找 `{...}` 对象边界，丢了外层 `[]`，`json.Unmarshal` 到 slice 时失败 → 500（耗时 6s 说明 API 调用成功但解析失败）。修复：`extractJSON` 优先匹配 `[...]` 数组，回退匹配 `{...}` 对象。一键修复三个方法。

---

### 9.3 作品级角色设定 vs 剧本级角色装扮

角色的长相、年龄、体型是固定属性，不应挂在每集剧本上重复生成。

| 层级       | 存储位置                         | 内容                   | 变化性           |
| ---------- | -------------------------------- | ---------------------- | ---------------- |
| **作品级** | `work.character_profiles`        | 长相、年龄、性格、背景 | 固定，全作品共享 |
| **剧本级** | `script.characters[].appearance` | 当集装束/打扮          | 每集可变         |

**模型扩展**：`CharacterProfile` 加 `Appearance` + `Background`；`Character` 加 `Appearance`。

**AI 方法**：`GenerateWorkCharacterProfiles` — 以人物设定师身份，接收角色列表 + 剧情梗概，一次性生成长相/年龄/性格/背景。

**新增路由**：

| 路由                                               | Handler                        | 说明           |
| -------------------------------------------------- | ------------------------------ | -------------- |
| `POST /v1/works/:id/characters/profiles`           | `GenerateCharacterProfiles`    | 作品级角色设定 |
| `POST /v1/scripts/:scriptID/characters/appearance` | `GenerateCharacterAppearances` | 剧本级角色装扮 |
| `POST /v1/scripts/:scriptID/scenes/environment`    | `GenerateSceneEnvironments`    | 剧本级场景环境 |

---

### 9.4 编译错误修复

| 错误                           | 根因                                         | 修复                                      |
| ------------------------------ | -------------------------------------------- | ----------------------------------------- |
| `h.workRepo.GetByID undefined` | WorkRepository 方法名是 `Get` 不是 `GetByID` | 改为 `h.workRepo.Get(workID)`             |
| WorkHandler 缺少 AI 依赖       | 构造函数未接收 `providerRepo`/`aiClient`     | `NewWorkHandler` 加参数，`main.go` 传实参 |

---

### 9.5 前端修复

| 问题                            | 修复                                       |
| ------------------------------- | ------------------------------------------ |
| 作品信息卡不显示（条件过严）    | 去掉条件，始终显示；无内容时显示引导文字   |
| AI 按钮与梗概按钮挤在同一行     | 角色装扮移入角色 Tab，场景环境移入场景 Tab |
| SearchReplace 残留重复 JSX 标签 | 手动删除                                   |
| NovelInputPage 选项太少         | 格式 3→7 个，风格 3→11 个                  |

---

### 测试验证

| 测试项                    | 预期结果               | 状态 |
| ------------------------- | ---------------------- | ---- |
| 后端编译 `go build ./...` | 无错误                 | PASS |
| extractJSON 数组/对象     | 分别正确提取           | PASS |
| 作品信息卡                | 始终可见，引导文字正确 | PASS |
| 角色设定按钮（无剧本时）  | disabled               | PASS |
| 装扮/环境按钮位置         | 分别在对应 Tab 顶部    | PASS |

---

## 附录：涉及文件清单

| 文件                                              | 变更类型 | 说明                                                                                                                                               |
| ------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/internal/handler/response.go`            | 新增     | 统一响应结构 + 10 个辅助函数                                                                                                                       |
| `backend/internal/handler/auth_handler.go`        | 修改     | 改为统一响应格式                                                                                                                                   |
| `backend/internal/handler/work_handler.go`        | 修改     | 改为统一响应格式                                                                                                                                   |
| `backend/internal/handler/script_handler.go`      | 修改     | 改为统一响应格式 + 新增 GenerateSummary                                                                                                            |
| `backend/internal/handler/inspiration_handler.go` | 修改     | 改为统一响应格式 + GenerateArticle 改同步                                                                                                          |
| `backend/internal/model/script.go`                | 修改     | 新增 Summary 字段                                                                                                                                  |
| `backend/internal/service/script_service.go`      | 修改     | 新增 GenerateSummary 方法                                                                                                                          |
| `backend/internal/ai/client.go`                   | 修改     | 新增 GenerateScriptSummary 方法                                                                                                                    |
| `backend/cmd/server/main.go`                      | 修改     | 补注册 summary 路由                                                                                                                                |
| `frontend/src/services/api.js`                    | 修改     | 响应拦截器增加统一解包                                                                                                                             |
| `frontend/src/services/inspiration.js`            | 修改     | 生成请求超时改为 120 秒                                                                                                                            |
| `frontend/src/components/SceneCard.jsx`           | 修改     | 增加编辑图标 + 表演提示输入框                                                                                                                      |
| `frontend/src/styles/scene-card.css`              | 修改     | parenthetical 输入框样式                                                                                                                           |
| `frontend/src/pages/WorkDetailPage.jsx`           | 修改     | 剧集编辑图标 + 一句话梗概卡片 + 删除草稿标签                                                                                                       |
| `frontend/src/pages/InspirationPage.jsx`          | 修改     | 全屏加载弹窗 + 自动插入文章 + 话题榜刷新                                                                                                           |
| `backend/internal/ai/client.go`                   | 修改     | 修复 buildStructuredPrompt 参数 + extractJSON 数组支持 + 新增 GenerateCharacterAppearances/GenerateSceneEnvironments/GenerateWorkCharacterProfiles |
| `backend/internal/model/work.go`                  | 修改     | CharacterProfile 加 Appearance/Background                                                                                                          |
| `backend/internal/model/script.go`                | 修改     | Character 加 Appearance                                                                                                                            |
| `backend/internal/handler/work_handler.go`        | 修改     | 注入 AI 依赖 + 新增 GenerateCharacterProfiles                                                                                                      |
| `backend/internal/handler/script_handler.go`      | 修改     | 新增 GenerateCharacterAppearances / GenerateSceneEnvironments                                                                                      |
| `backend/internal/service/script_service.go`      | 修改     | 透传 format/style + 新增 GenerateCharacterAppearances/GenerateSceneEnvironments                                                                    |
| `backend/cmd/server/main.go`                      | 修改     | 注册 3 条新路由 + WorkHandler 构造函数传参                                                                                                         |
| `frontend/src/pages/NovelInputPage.jsx`           | 修改     | 扩展格式/风格选项列表                                                                                                                              |
| `frontend/src/pages/WorkDetailPage.jsx`           | 修改     | 作品级/剧本级 AI 按钮 + 外貌/背景渲染 + 信息卡始终可见                                                                                             |
| `frontend/src/services/work.js`                   | 修改     | 新增 generateCharacterProfiles API                                                                                                                 |
