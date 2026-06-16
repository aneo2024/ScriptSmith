# 剧匠 ScriptSmith

将小说文本通过 AI 转换为结构化剧本，支持多格式、多剧集管理、角色小传生成与 YAML 导出。

**项目演示视频**: [B站链接](https://www.bilibili.com/video/BV1yuEh6GE3L/?vd_source=8ac9ee2de57af0dd1bba425929e7f095)

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite 6 + Ant Design 5 + Zustand + CodeMirror |
| 后端 | Go 1.25 + Gin + GORM |
| 数据库 | SQLite（开发） / PostgreSQL 16（生产） |
| AI | DeepSeek API（OpenAI 兼容，支持自定义 Provider） |
| 部署 | Docker Compose（PostgreSQL + Go + Nginx） |

## 快速开始

### 环境要求

- Go 1.25+
- Node.js 20+
- Docker & Docker Compose（可选，用于一键部署）

### 本地开发

**1. 克隆项目**

```bash
git clone https://github.com/aneo2024/ScriptSmith.git
cd ScriptSmith
```

**2. 配置环境变量**

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入必填项：

```env
DEEPSEEK_API_KEY=你的API密钥
JWT_SECRET=随机字符串
```

**3. 启动后端**

```bash
cd backend
go run ./cmd/server
```

默认使用 SQLite，数据存储在 `backend/scriptsmith.db`，服务启动在 `http://localhost:8080`。

**4. 启动前端**

```bash
cd frontend
npm install
npm run dev
```

Vite 开发服务器启动在 `http://localhost:5173`，自动代理 `/v1` API 到后端。

### Docker 一键部署

```bash
docker compose up -d
```

启动后访问 `http://localhost`：

| 容器 | 说明 | 端口 |
|------|------|------|
| scriptsmith-postgres | PostgreSQL 16 | 5432 |
| scriptsmith-backend | Go 后端 | 8080 |
| scriptsmith-nginx | Nginx + 前端静态文件 | 80 |

Docker 环境默认使用 PostgreSQL，通过 `docker-compose.yml` 中的 `DB_DSN` 环境变量配置。

## 运行测试

```bash
cd backend

# 运行所有测试
go test ./...

# 按包运行
go test -v ./internal/repository/     # 数据访问层测试
go test -v ./internal/handler/        # API 处理器集成测试
go test -v ./pkg/jwt/                 # JWT 工具测试

# 测试覆盖率
go test -cover ./...
```

测试默认使用 SQLite 内存数据库，无需额外配置。

## 功能清单

### 核心功能
- [x] 用户注册/登录（JWT + Refresh Token 一次性轮换）
- [x] 小说文本输入与 AI 转换（DeepSeek / 自定义模型）
- [x] 异步任务进度跟踪（支持离开页面后继续生成）
- [x] 多格式支持：电影 / 电视剧 / 舞台剧 / 动画 / 短片 / 网剧 / 纪录片
- [x] 多改编风格：忠实 / 商业 / 实验 / 悬疑 / 武侠 / 仙侠 / 喜剧 / 悲剧等

### 作品管理
- [x] 作品 CRUD 与统计
- [x] 多剧集管理（删除后自动重新编号）
- [x] 作品级角色人设卡

### 剧本编辑
- [x] 结构化剧本编辑器（场景导航 + 内容块增删改）
- [x] YAML 语法高亮编辑与导出
- [x] AI 生成剧本摘要、角色外貌、场景环境

### 人物小传
- [x] 作品级人物小传管理
- [x] 独立人物小传页面（AI 生成生平传记 + 手动编辑）
- [x] 支持外貌、性格、背景、生平文章四个维度

### 灵感创作
- [x] 灵感文章浏览与 AI 生成
- [x] 话题系统与每日推荐

### 系统功能
- [x] 自定义 AI Provider 管理（多模型配置、连接测试）
- [x] 管理员面板

## 环境变量

| 变量名 | 必填 | 说明 | 默认值 |
|--------|------|------|--------|
| `DEEPSEEK_API_KEY` | 是 | AI API 密钥 | - |
| `DEEPSEEK_BASE_URL` | 否 | API 基础地址 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 模型名称 | `deepseek-chat` |
| `DB_TYPE` | 否 | 数据库类型 `sqlite` / `postgres` | `sqlite` |
| `DB_PATH` | 否 | SQLite 文件路径 | `scriptsmith.db` |
| `DB_DSN` | 否 | PostgreSQL 连接串 | `postgres://postgres:postgres@localhost:5432/scriptsmith?sslmode=disable` |
| `PORT` | 否 | 后端端口 | `8080` |
| `JWT_SECRET` | 是 | JWT 签名密钥 | - |

## 数据存储

开发模式默认使用 SQLite，所有数据存储在 `backend/scriptsmith.db` 单文件中，备份此文件即可保存全部数据。

切换到 PostgreSQL 只需在 `.env` 中设置：

```env
DB_TYPE=postgres
DB_DSN=postgres://postgres:postgres@localhost:5432/scriptsmith?sslmode=disable
```

程序启动时会通过 GORM AutoMigrate 自动创建/更新表结构。

## 项目结构

```
ScriptSmith/
├── docker/
│   ├── Dockerfile             # 前端多阶段构建（Node + Nginx）
│   ├── Dockerfile.backend     # Go 后端多阶段构建
│   ├── Dockerfile.nginx       # Nginx + 前端静态文件
│   └── nginx.conf             # Nginx 反向代理配置
├── docker-compose.yml         # Docker 一键部署编排
├── backend/
│   ├── cmd/server/main.go     # 入口：路由注册、数据库初始化
│   └── internal/
│       ├── ai/                # AI 客户端封装（小说转换、角色生成、生平传记）
│       ├── handler/           # HTTP 请求处理器
│       │   ├── auth_handler.go
│       │   ├── script_handler.go
│       │   ├── work_handler.go           # 作品 CRUD
│       │   ├── work_character_handler.go # 人物小传 API
│       │   └── ...
│       ├── middleware/        # JWT 认证、角色鉴权
│       ├── model/             # 数据模型（GORM）
│       ├── repository/        # 数据访问层
│       ├── service/           # 业务逻辑层
│       └── pkg/jwt/           # JWT 签发与校验工具
├── frontend/
│   └── src/
│       ├── pages/             # 页面组件
│       │   ├── CreateWorkPage.jsx        # 创建作品 + 人物卡片
│       │   ├── WorkDetailPage.jsx        # 作品详情 + 人物小传列表
│       │   ├── CharacterProfilePage.jsx  # 人物小传生成/编辑
│       │   └── ...
│       ├── components/        # 可复用组件
│       ├── hooks/             # 自定义 Hooks（useTask 支持后台轮询）
│       ├── services/          # API 请求封装
│       ├── store/             # Zustand 状态管理
│       └── utils/             # 工具函数
└── README.md
```

## API 概览

所有 API 挂载在 `/v1` 前缀下，需认证的接口在请求头携带 `Authorization: Bearer <token>`。

### 认证

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 登录获取 token |
| POST | `/auth/refresh` | 刷新 token |
| POST | `/auth/logout` | 登出 |
| GET | `/auth/me` | 获取当前用户信息 |

### 转换任务

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/convert` | 提交小说转换任务 |
| GET | `/task/:id` | 查询任务状态 |
| DELETE | `/task/:id` | 取消任务 |

### 剧本

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/scripts/by-task/:taskID` | 按任务 ID 获取剧本 |
| GET | `/scripts/:id` | 获取剧本详情 |
| PUT | `/scripts/:id` | 保存剧本 |
| DELETE | `/scripts/:id` | 删除剧本（自动重编号剩余剧集） |
| GET | `/scripts/:id/yaml` | 导出 YAML |
| GET | `/scripts/:id/characters` | 获取角色列表 |
| GET | `/scripts/:id/scenes` | 获取场景列表 |
| PUT | `/scripts/:id/scenes/:sid` | 更新场景 |
| POST | `/scripts/:id/scenes/:sid/contents` | 添加内容块 |
| DELETE | `/scripts/:id/contents/:cid` | 删除内容块 |

### 作品

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/works` | 创建作品 |
| GET | `/works` | 作品列表 |
| GET | `/works/stats` | 统计（作品数 + 总字数） |
| GET | `/works/count` | 作品数量 |
| GET | `/works/:id` | 作品详情 |
| PUT | `/works/:id` | 更新作品 |
| DELETE | `/works/:id` | 删除作品（级联删除剧本） |
| GET | `/works/:id/scripts` | 作品下的剧本列表 |

### 人物小传

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/works/:id/characters/profiles` | AI 批量生成角色设定 |
| POST | `/works/:id/characters/:index/biography` | AI 生成单人生平传记 |
| PUT | `/works/:id/characters/:index` | 更新单个人物小传 |

### AI 增强

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/scripts/:id/summary` | AI 生成剧本摘要 |
| POST | `/scripts/:id/characters/appearance` | AI 生成角色外貌 |
| POST | `/scripts/:id/scenes/environment` | AI 生成场景环境 |

### 灵感

| 方法 | 端点 | 说明 |
|------|------|------|
| GET/POST | `/inspiration/articles` | 文章列表 / 创建 |
| GET | `/inspiration/articles/:id` | 文章详情 |
| POST | `/inspiration/articles/:id/like` | 点赞 |
| POST | `/inspiration/generate` | AI 生成文章 |
| GET/POST | `/inspiration/topics` | 话题列表 / 创建 |
| GET | `/inspiration/topics/today` | 今日推荐话题 |

### AI Provider 管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET/POST | `/ai/providers` | 列表 / 创建 |
| PUT | `/ai/providers/:id` | 更新 |
| DELETE | `/ai/providers/:id` | 删除 |
| PUT | `/ai/providers/:id/default` | 设为默认 |
| POST | `/ai/providers/:id/test` | 测试连接 |

### 管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/admin/tasks` | 管理员查看所有任务 |

## License

Apache-2.0
