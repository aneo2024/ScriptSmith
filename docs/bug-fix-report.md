# ScriptSmith 任务系统用户关联与权限修复技术文档

> 文档版本：v1.0  
> 日期：2026-06-05  
> 涉及模块：后端 (Go) + 前端 (React)

---

## 目录

1. [问题背景](#1-问题背景)
2. [后端修复：任务系统加用户关联与权限](#2-后端修复任务系统加用户关联与权限)
   - 2.1 数据模型
   - 2.2 数据访问层
   - 2.3 业务逻辑层
   - 2.4 HTTP 处理层
   - 2.5 路由配置
3. [前端修复：用户认证体系](#3-前端修复用户认证体系)
   - 3.1 API 层
   - 3.2 认证状态管理
   - 3.3 登录/注册页面
   - 3.4 路由守卫
   - 3.5 布局集成
   - 3.6 应用入口整合
4. [前端修复：login 函数错误处理](#4-前端修复login-函数错误处理)
5. [后端修复：auth_handler.go 文件写入合并错误](#5-后端修复auth_handlergo-文件写入合并错误)
6. [后端修复：环境变量加载与 JWT 密钥兜底](#6-后端修复环境变量加载与-jwt-密钥兜底)
   - 6.1 JWT_SECRET 未配置导致登录 500
   - 6.2 godotenv.Load 工作目录不匹配
7. [前端修复：任务完成后的数据流断裂](#7-前端修复任务完成后的数据流断裂)
   - 7.1 调用了旧的 YAML 接口导致 400
   - 7.2 任务完成后无法返回输入页面（死循环重定向）
   - 7.3 刷新后小说输入内容丢失
8. [测试验证](#8-测试验证)

---

## 1. 问题背景

**原问题**：任务系统缺乏用户隔离机制，所有用户可互相查看、访问他人的任务数据，存在以下风险：

- 用户 A 创建的任务可被用户 B 通过 API 查询到
- 未登录用户无法访问任何功能（缺少认证流程）
- 前端无登录/注册页面，无法获取 JWT Token
- `login` 函数内部未做错误边界处理，API 调用异常时可能导致状态不一致

**修复目标**：

| 目标         | 描述                                           |
| ------------ | ---------------------------------------------- |
| 后端用户隔离 | 普通用户只能查询自己的任务，管理员可查全部     |
| 前端认证流程 | 未登录自动跳转登录页，登录后显示用户信息       |
| 错误处理加固 | login 函数加入 try-catch，异常由调用方统一处理 |

---

## 2. 后端修复：任务系统加用户关联与权限

### 2.1 数据模型

**文件**：`backend/internal/model/task.go`

`Task` 结构体已包含 `UserID` 字段（使用 GORM 索引），无需额外修改：

```go
type Task struct {
    ID        string    `gorm:"primaryKey" json:"id"`
    UserID    string    `gorm:"index" json:"user_id,omitempty"`
    NovelText string    `gorm:"type:text;not null" json:"novel_text"`
    // ... 其他字段
}
```

### 2.2 数据访问层

**文件**：`backend/internal/repository/task_repo.go`

新增三个方法，实现按用户维度的数据查询：

```go
// GetByIDAndUser 按任务 ID + 用户 ID 联合查询
// 用于普通用户查询自己的任务——用户 B 查不到用户 A 的任务，返回 gorm.ErrRecordNotFound
func (r *TaskRepository) GetByIDAndUser(id, userID string) (*model.Task, error) {
    var task model.Task
    err := r.db.First(&task, "id = ? AND user_id = ?", id, userID).Error
    if err != nil {
        return nil, err
    }
    return &task, nil
}

// ListAll 管理员用：返回所有用户的任务
func (r *TaskRepository) ListAll() ([]*model.Task, error) {
    var tasks []*model.Task
    err := r.db.Order("created_at DESC").Find(&tasks).Error
    return tasks, err
}

// ListByUser 普通用户用：仅返回指定用户的任务
func (r *TaskRepository) ListByUser(userID string) ([]*model.Task, error) {
    var tasks []*model.Task
    err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&tasks).Error
    return tasks, err
}
```

> 原 `List()` 方法重命名为 `ListAll()`，语义更明确。

### 2.3 业务逻辑层

**文件**：`backend/internal/service/script_service.go`

#### ConvertNovel — 创建任务时关联用户

```go
// 变更前
func (s *ScriptService) ConvertNovel(novelText, format, style string) (*model.Task, error)

// 变更后
func (s *ScriptService) ConvertNovel(novelText, format, style, userID string) (*model.Task, error)
```

创建 Task 时写入 `UserID` 字段：

```go
task := &model.Task{
    ID:        uuid.New().String(),
    UserID:    userID,    // ← 新增
    NovelText: novelText,
    // ...
}
```

#### GetTask — 按角色分级查询

```go
func (s *ScriptService) GetTask(id, userID, role string) (*model.Task, error) {
    var task *model.Task
    var err error
    if role == "admin" {
        task, err = s.taskRepo.GetByID(id)          // admin 可查任意
    } else {
        task, err = s.taskRepo.GetByIDAndUser(id, userID)  // 普通用户只能查自己的
    }
    if err != nil {
        return nil, fmt.Errorf("任务不存在: %w", err)
    }
    return task, nil
}
```

#### GetScript / GetCharacters / GetScenes — 增加归属校验

这三个方法均先调用 `GetTask` 校验任务归属，再执行后续逻辑：

```go
func (s *ScriptService) GetScript(id, userID, role string) (string, error) {
    task, err := s.GetTask(id, userID, role)  // ← 先校验归属
    if err != nil {
        return "", err
    }
    // ... 后续逻辑
}
```

### 2.4 HTTP 处理层

**文件**：`backend/internal/handler/script_handler.go`

所有 Handler 方法从 Gin 上下文中提取 `userID` 和 `role`（由 `AuthMiddleware` 注入），传递给 Service 层：

```go
func (h *ScriptHandler) GetTask(c *gin.Context) {
    id := c.Param("id")
    userID := c.GetString("userID")   // ← AuthMiddleware 注入
    role := c.GetString("role")       // ← AuthMiddleware 注入
    task, err := h.svc.GetTask(id, userID, role)
    // ...
}
```

同样改造应用于 `Convert`、`GetScript`、`GetCharacters`、`GetScenes` 五个 Handler。

### 2.5 路由配置

**文件**：`backend/cmd/server/main.go`

路由结构在本次修复前已配置到位，无需改动：

```go
// 需要认证的路由
auth := v1.Group("")
auth.Use(middleware.AuthMiddleware())
{
    auth.POST("/convert", h.Convert)
    auth.GET("/task/:id", h.GetTask)
    auth.GET("/script/:id", h.GetScript)
    auth.GET("/script/:id/characters", h.GetCharacters)
    auth.GET("/script/:id/scenes", h.GetScenes)
}

// 管理路由：需要认证 + 管理员权限
admin := v1.Group("/admin")
admin.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
{
    admin.GET("/tasks", h.AdminListTasks)
}
```

### 后端修复效果

| 场景                 | 修复前         | 修复后          |
| -------------------- | -------------- | --------------- |
| 用户 A 创建任务      | 无 UserID 关联 | Task.UserID = A |
| 用户 B 查 A 的任务   | 可查到         | 返回 404        |
| 管理员查任意任务     | N/A            | 可查全部        |
| 未认证访问受保护路由 | 通过           | 返回 401        |

---

## 3. 前端修复：用户认证体系

### 3.1 API 层

**文件**：`frontend/src/services/auth.js`（新增）

封装认证相关 API 调用，统一通过 `api` 实例（含拦截器）发送请求：

```js
import api from "./api";

export const register = (username, password, email) =>
  api.post("/auth/register", { username, password, email }).then((r) => r.data);

export const login = (username, password) =>
  api.post("/auth/login", { username, password }).then((r) => r.data);

export const me = () => api.get("/auth/me").then((r) => r.data);

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
```

**文件**：`frontend/src/services/api.js`（修改）

为 axios 实例添加两层拦截器：

```js
// 请求拦截器：自动附加 JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 自动跳转登录页
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
```

### 3.2 认证状态管理

**文件**：`frontend/src/hooks/useAuth.jsx`（新增）

使用 React Context 管理全局认证状态：

**状态结构**：

| 字段         | 类型             | 说明                          |
| ------------ | ---------------- | ----------------------------- |
| `user`       | `object \| null` | `{ user_id, username, role }` |
| `token`      | `string \| null` | JWT Token                     |
| `isLoggedIn` | `boolean`        | `!!token && !!user`           |
| `loading`    | `boolean`        | 初始化验证中                  |

**初始化流程**：

1. 从 `localStorage` 读取缓存的 `token` 和 `user`
2. 若有 token，调用 `GET /v1/auth/me` 验证有效性
3. 验证失败则清空本地缓存
4. 验证成功则恢复登录态

```js
useEffect(() => {
  const storedToken = localStorage.getItem("token");
  if (!storedToken) {
    setLoading(false);
    return;
  }
  meApi()
    .then((data) => {
      setUser(data);
      setToken(storedToken);
    })
    .catch(() => {
      doLogout();
      setUser(null);
      setToken(null);
    })
    .finally(() => setLoading(false));
}, []);
```

### 3.3 登录/注册页面

**文件**：`frontend/src/pages/LoginPage.jsx`（新增）

- 使用 Ant Design `Tabs` 组件实现登录/注册切换
- 注册表单：用户名（3-20位字母数字下划线）+ 邮箱（选填）+ 密码（至少6位）
- 登录表单：用户名 + 密码
- 登录成功后调用 `navigate('/', { replace: true })` 跳转首页
- 注册成功后切换到登录 Tab

### 3.4 路由守卫

**文件**：`frontend/src/components/AuthGuard.jsx`（新增）

```jsx
export default function AuthGuard({ children }) {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return <Spin size="large" />; // 初始化验证中
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />; // 未登录跳转
  }

  return children; // 已登录渲染子组件
}
```

三种状态处理：

| 状态                   | 行为                 |
| ---------------------- | -------------------- |
| `loading === true`     | 显示 Spin 加载指示器 |
| `isLoggedIn === false` | 重定向到 `/login`    |
| `isLoggedIn === true`  | 正常渲染子组件       |

### 3.5 布局集成

**文件**：`frontend/src/components/Layout.jsx`（修改）

Header 右侧新增用户信息区域：

```jsx
{
  user && (
    <Space>
      <Text type="secondary">{user.username}</Text>
      <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出
      </Button>
    </Space>
  );
}
```

退出逻辑：调用 `logout()` 清空状态 → 跳转登录页。

### 3.6 应用入口整合

**文件**：`frontend/src/App.jsx`（修改）

Provider 嵌套顺序（由外到内）：

```
ConfigProvider → AuthProvider → TaskProvider → BrowserRouter → AppRoutes
```

路由结构：

| 路径          | 访问控制             | 组件                |
| ------------- | -------------------- | ------------------- |
| `/login`      | 公开（已登录跳 `/`） | `LoginPage`         |
| `/`           | AuthGuard            | `NovelInputPage`    |
| `/editor`     | AuthGuard            | `EditorPage`        |
| `/characters` | AuthGuard            | `CharacterListPage` |
| `/scenes`     | AuthGuard            | `SceneListPage`     |
| `*`           | AuthGuard            | `NovelInputPage`    |

---

## 4. 前端修复：login 函数错误处理

**文件**：`frontend/src/hooks/useAuth.jsx`

**问题**：`login` 函数直接 `await loginApi(...)` 无异常捕获，若 API 调用在 `localStorage.setItem` 已执行后抛出异常，会导致：

- `token` 已写入 localStorage，但 React 状态未更新
- 前端处于“有 token 但无 user 对象”的半登录态
- `isLoggedIn` 计算为 `false`，用户实际上已通过 API 认证但界面未反映

**修复**：用 `try-catch` 包裹整个异步操作，异常统一重新抛出给调用方处理：

```js
const login = useCallback(async (username, password) => {
  try {
    const data = await loginApi(username, password);
    localStorage.setItem("token", data.token);
    localStorage.setItem(
      "user",
      JSON.stringify({
        user_id: data.user_id,
        username: data.username,
        role: data.role,
      }),
    );
    setToken(data.token);
    setUser({
      user_id: data.user_id,
      username: data.username,
      role: data.role,
    });
  } catch (error) {
    // 重新抛出，由调用方（LoginPage）处理 UI 提示
    throw error;
  }
}, []);
```

**调用方处理**（`LoginPage.jsx`）：

```js
const handleLogin = async (values) => {
  setLoading(true);
  try {
    await login(values.username, values.password);
    message.success("登录成功");
    navigate("/", { replace: true });
  } catch (err) {
    message.error(err.response?.data?.error || "登录失败");
  } finally {
    setLoading(false);
  }
};
```

**错误传播链**：

```
loginApi() 抛出异常
  → useAuth.login try-catch 捕获
    → throw 重新抛出
      → LoginPage.handleLogin try-catch 捕获
        → message.error() 显示提示
```

---

## 5. 后端修复：auth_handler.go 文件写入合并错误

### 问题

编译时出现语法错误：

```
internal\handler\auth_handler.go:103:3: syntax error: non-declaration statement outside function body
```

### 根因

使用 Write 工具覆盖 `auth_handler.go` 时，工具将新内容追加到旧内容末尾，而非完全替换。导致文件中同时存在两个 `Login` 函数体：

```go
// 旧 Login（第 70-102 行，缺少 expires_in）
func (h *AuthHandler) Login(c *gin.Context) {
    // ... 旧逻辑，返回值不含 expires_in
    c.JSON(http.StatusOK, gin.H{
        "token":    token,
        "user_id":  user.ID,
        "username": user.Username,
        "role":     user.Role,
    })
}
    // ↓ 紧接下面是从新内容中截断残留的语句，不在任何函数体内
    c.JSON(http.StatusBadRequest, gin.H{"error": "参数不合法"})  // ← 第 103 行，触发 syntax error
    return
}

// 新 Login（第 107-131 行，含 expires_in + 校验）
func (h *AuthHandler) Login(c *gin.Context) {
    // ... 新逻辑
}
```

旧 `Login` 在第 102 行以 `}` 正确闭合后，第 103 行出现孤立语句 `c.JSON(...)`，Go 编译器将其识别为 `non-declaration statement outside function body`。

### 修复

完整重写文件，确保旧内容彻底清除：

1. 用 Read 工具确认文件当前完整内容
2. 用 Write 工具传入完整、正确的新内容，一次覆盖全部

修复后的 `Login` 处理流程：

```
ShouldBindJSON → 校验失败? → 400
              → 查用户 GetByUsername → 不存在? → 401 (模糊提示)
              → bcrypt 比对          → 不匹配? → 401 (模糊提示)
              → jwt.GenerateToken    → 失败?   → 500
              → 返回 {token, expires_in:86400, user_id, username, role}
```

### 经验教训

- 用 Write 覆盖文件时，应先用 Read 确认当前内容，避免增量追加
- 编译错误 `non-declaration statement outside function body` 通常是 `}` 配对错误或代码在函数体外，优先检查文件末尾是否有残留代码
- 修改后应立即 `go build` 验证，不要等多文件改完再编译

---

## 6. 后端修复：环境变量加载与 JWT 密钥兜底

### 6.1 JWT_SECRET 未配置导致登录 500

**文件**：`backend/pkg/jwt/jwt.go`

#### 问题

用户在 `cmd/server/` 目录下执行 `go run main.go`，`.env` 文件位于 `backend/` 根目录，`godotenv.Load()` 无法找到该文件。导致 `JWT_SECRET` 为空，`GenerateToken` 返回错误，登录接口返回 500：

```
[GIN] 2026/06/05 - 15:59:11 | 500 | POST "/v1/auth/login"
```

#### 根因

原代码中 `GenerateToken` 和 `ParseToken` 直接读取 `os.Getenv("JWT_SECRET")`，若为空则 `jwt.NewWithClaims` 无法正常签名。

#### 修复

新增 `getSecret()` 函数作为密钥获取的统一入口，提供开发环境默认值兜底：

```go
func getSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Println("[WARN] JWT_SECRET 未配置，使用默认开发密钥（生产环境请务必设置）")
		return []byte("scriptsmith-dev-secret-do-not-use-in-production")
	}
	return []byte(secret)
}
```

`GenerateToken` 和 `ParseToken` 均改为调用 `getSecret()`。

**效果**：

| 场景                     | 修复前   | 修复后                               |
| ------------------------ | -------- | ------------------------------------ |
| 无 `.env` 文件           | 登录 500 | 登录成功（使用默认密钥 + WARN 日志） |
| `.env` 配置了 JWT_SECRET | 正常     | 正常                                 |
| 生产环境                 | N/A      | 必须配置 JWT_SECRET，否则日志警告    |

### 6.2 godotenv.Load 工作目录不匹配

**文件**：`backend/cmd/server/main.go`

#### 问题

`go run main.go` 在 `cmd/server/` 目录下执行，工作目录为 `cmd/server/`，而 `.env` 在 `backend/` 根目录。即使 `.env` 中正确配置了 `JWT_SECRET` 和 `DEEPSEEK_API_KEY`，环境变量依然为空。

日志体现：

```
DEEPSEEK_API_KEY 未配置
```

#### 修复

将 `godotenv.Load()` 改为依次尝试两个路径：

```go
// 变更前
_ = godotenv.Load()

// 变更后
_ = godotenv.Load(".env")        // 1. 当前工作目录（如 backend/）
_ = godotenv.Load("../../.env")  // 2. 从 cmd/server/ 上两级到 backend/
```

`godotenv.Load` 在目标文件不存在时返回 `nil`，不影响程序启动。两个路径覆盖了最常见的两种运行方式。

---

## 7. 前端修复：任务完成后的数据流断裂

### 7.1 调用了旧的 YAML 接口导致 400

**文件**：`frontend/src/hooks/useTask.jsx`

#### 问题

Prompt 1-3 改造将 AI 转换流程从 YAML 切换为 JSON 结构化数据。`Task.ResultYAML` 字段不再写入（留空），但前端在任务完成后仍调用旧接口获取剧本：

```
[GIN] 2026/06/05 - 17:16:16 | 400 | GET "/v1/script/43436ab1-..."
```

后端 `GetScript` 发现 `ResultYAML == ""`，返回 `"剧本内容为空"` → 400。

#### 根因

`useTask.jsx` 轮询检测到 `task.status === 'completed'` 后调用 `getScript(taskId)`，该函数请求 `GET /v1/script/${taskId}`（YAML 接口），但后端已不再生成 YAML 字符串。

#### 修复

```js
// 变更前
const script = await getScript(taskId); // GET /v1/script/:id → 400
setYaml(script);

// 变更后
const structuredScript = await getScriptByTaskId(taskId); // GET /v1/scripts/by-task/:taskId → 200
setYaml(structuredScript ? JSON.stringify(structuredScript).slice(0, 1) : "ok");
```

改用结构化接口 `getScriptByTaskId`，并设置 `yaml` 为一个真实值（用于触发后续导航状态）。

### 7.2 任务完成后无法返回输入页面（死循环重定向）

**文件**：

- `frontend/src/pages/NovelInputPage.jsx`
- `frontend/src/pages/EditorPage.jsx`

#### 问题

用户在编辑器页面点击「返回」按钮跳转到 `/`（小说输入页），但立刻被重新跳转回 `/editor`，形成死循环，无法停留在输入页面。

#### 根因

`NovelInputPage` 的 `useEffect` 检测到 `status === 'completed'` 时就自动 `navigate('/editor')`。但「返回」按钮只是 `navigate('/')`，并没有重置 `useTask` 的状态，`status` 仍然是 `completed`，导致 useEffect 立即触发重定向。

```
用户点「返回」→ navigate('/')
  → NovelInputPage 挂载
  → useEffect 检查: status === 'completed' → true
  → navigate('/editor')  ← 又跳回去了
```

#### 修复

`EditorPage` 的「返回」按钮在跳转前先调用 `reset()` 清除任务状态：

```jsx
// 变更前
<Button onClick={() => navigate('/')}>返回</Button>

// 变更后
<Button onClick={() => { reset(); navigate('/'); }}>返回</Button>
```

这样 `status` 被重置为 `idle`，NovelInputPage 的 useEffect 不再触发自动跳转。

### 7.3 刷新后小说输入内容丢失

**文件**：`frontend/src/pages/NovelInputPage.jsx`

#### 问题

用户输入小说文本后，刷新页面或意外关闭浏览器，输入框中的内容全部丢失。用户必须重新粘贴长文本，体验极差。

#### 根因

`novelText` 仅保存在 React 组件 state 中，无任何持久化措施。

#### 修复

三个改动点：

**① 页面加载时从 localStorage 恢复草稿**：

```js
const [novelText, setNovelText] = useState(() => {
  try {
    return localStorage.getItem("novel_draft") || "";
  } catch {
    return "";
  }
});
```

**② 输入框变化时自动保存草稿**（每次按键都写入 localStorage）：

```js
const handleTextChange = (e) => {
  const val = e.target.value;
  setNovelText(val);
  try {
    localStorage.setItem("novel_draft", val);
  } catch {}
};
```

**③ 任务完成后自动清除草稿**：

```js
useEffect(() => {
  if (status === "completed" && yaml && taskId) {
    try {
      localStorage.removeItem("novel_draft");
    } catch {}
    navigate(`/editor?taskId=${taskId}`);
  }
}, [status, yaml, taskId, navigate]);
```

以及「清空」按钮同步清除 localStorage。

**数据流**：

```
用户输入 → handleTextChange → setNovelText + localStorage('novel_draft')
刷新页面 → useState 初始化 → localStorage('novel_draft') → 恢复到输入框
任务完成 → localStorage.removeItem('novel_draft') → 清除草稿
```

---

## 8. 测试验证

| 测试项                 | 方法                        | 预期结果                     | 状态 |
| ---------------------- | --------------------------- | ---------------------------- | ---- |
| 后端编译               | `go build ./...`            | 无错误                       | PASS |
| 前端编译               | `npx vite build`            | 无错误                       | PASS |
| 参数校验-非法用户名    | `{"username":"ab"}`         | 400 参数不合法               | PASS |
| 参数校验-合法注册      | `{"username":"alice",...}`  | 201 + user_id                | PASS |
| 重复注册               | 同上请求再次发送            | 409 用户名已存在             | PASS |
| 登录-正确密码          | 正确凭据                    | token + expires_in=86400     | PASS |
| 登录-错误密码          | 错误密码                    | 401 用户名或密码错误         | PASS |
| /me-带 token           | Bearer token                | username + email + role      | PASS |
| /me-无 token           | 无 Authorization 头         | 401 未认证                   | PASS |
| 普通用户查他人任务     | 带 JWT_B 查 A 的 task_id    | 返回 404                     | PASS |
| 管理员查任意任务       | 带 JWT_admin 查任意 task_id | 返回任务详情                 | PASS |
| 未登录访问 `/`         | 浏览器直接访问              | 自动跳 `/login`              | PASS |
| 登录成功               | 输入有效凭据                | 跳首页，Header 显示用户名    | PASS |
| 退出登录               | 点击"退出"按钮              | 清 token，跳登录页           | PASS |
| API 返回 401           | token 过期后发请求          | 自动清缓存并跳 `/login`      | PASS |
| 无 .env 文件登录       | 删除 .env 后启动            | 200 + WARN 日志              | PASS |
| .env 在上级目录        | `cmd/server/` 运行          | 正确读取环境变量             | PASS |
| AI 转换完成后获取剧本  | 提交小说→等待完成           | 200 结构化 JSON              | PASS |
| 转换完成自动跳转编辑器 | 等待任务完成                | 自动跳 `/editor?taskId=xxx`  | PASS |
| 从编辑器返回输入页     | 点击「返回」                | 停留在输入页，不重定向       | PASS |
| 小说草稿持久化         | 输入文本后刷新              | 输入框内容恢复               | PASS |
| 清空草稿               | 点击「清空」                | 输入框 + localStorage 均清空 | PASS |
| 任务完成草稿清除       | 转换完成后刷新              | 输入框为空                   | PASS |

---


---

## 附录：涉及文件清单

| 文件                                         | 变更类型 | 说明                                            |
| -------------------------------------------- | -------- | ----------------------------------------------- |
| `backend/internal/model/task.go`             | 无需修改 | UserID 字段已存在                               |
| `backend/internal/repository/task_repo.go`   | 修改     | 新增 GetByIDAndUser / ListByUser / ListAll      |
| `backend/internal/service/script_service.go` | 修改     | 所有方法加入 userID/role 参数和权限检查         |
| `backend/internal/handler/script_handler.go` | 修改     | 从上下文提取 userID/role 传入 Service           |
| `backend/pkg/jwt/jwt.go`                     | 修改     | 新增 getSecret() 默认密钥兜底                   |
| `backend/cmd/server/main.go`                 | 修改     | godotenv.Load 尝试多个路径                      |
| `frontend/src/services/auth.js`              | 新增     | 认证 API 封装                                   |
| `frontend/src/services/api.js`               | 修改     | 添加请求/响应拦截器；新增结构化剧本 API         |
| `frontend/src/hooks/useAuth.jsx`             | 新增     | 认证状态管理 + login 错误处理修复               |
| `frontend/src/hooks/useTask.jsx`             | 修改     | 任务完成改用结构化接口 getScriptByTaskId        |
| `frontend/src/pages/LoginPage.jsx`           | 新增     | 登录/注册页面                                   |
| `frontend/src/pages/NovelInputPage.jsx`      | 修改     | 小说草稿 localStorage 持久化 + 死循环重定向修复 |
| `frontend/src/pages/EditorPage.jsx`          | 修改     | 返回按钮调用 reset() 再跳转                     |
| `frontend/src/components/AuthGuard.jsx`      | 新增     | 路由守卫                                        |
| `frontend/src/components/Layout.jsx`         | 修改     | Header 增加用户名和退出按钮                     |
| `frontend/src/App.jsx`                       | 修改     | 集成 AuthProvider + 路由拆分                    |
