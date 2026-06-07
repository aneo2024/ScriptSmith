# 剧匠 ScriptSmith

将小说文本通过 AI 转换为结构化剧本，支持多格式、多剧集管理、角色/场景编辑与 YAML 导出。

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

- [x] 用户注册/登录（JWT + Refresh Token 一次性轮换）
- [x] 小说文本输入与 AI 转换（DeepSeek / 自定义模型）
- [x] 异步任务进度跟踪
- [x] 多格式支持：电影 / 电视剧 / 舞台剧 / 动画 / 短片 / 网剧 / 纪录片
- [x] 多改编风格：忠实 / 商业 / 实验 / 悬疑 / 武侠 / 仙侠 / 喜剧 / 悲剧等
- [x] 作品 & 多剧集管理（CRUD）
- [x] AI 生成剧本摘要、角色外貌、场景环境
- [x] 作品级角色人设卡（长相、年龄、性格、背景）
- [x] 结构化剧本编辑器（场景导航 + 内容块增删改）
- [x] YAML 语法高亮编辑与导出
- [x] 灵感文章浏览与 AI 生成
- [x] 话题系统与每日推荐
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
│       ├── ai/                # AI 客户端封装
│       ├── handler/           # HTTP 请求处理器
│       ├── middleware/        # JWT 认证、角色鉴权
│       ├── model/             # 数据模型（GORM）
│       ├── repository/        # 数据访问层
│       ├── service/           # 业务逻辑层
│       └── pkg/jwt/           # JWT 签发与校验工具
├── frontend/
│   └── src/
│       ├── pages/             # 页面组件
│       ├── components/        # 可复用组件
│       ├── hooks/             # 自定义 Hooks
│       ├── services/          # API 请求封装
│       ├── store/             # Zustand 状态管理
│       └── utils/             # 工具函数
└── README.md
```

## API 概览

所有 API 挂载在 `/v1` 前缀下，需认证的接口在请求头携带 `Authorization: Bearer <token>`。

| 模块 | 端点 |
|------|------|
| 认证 | `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `POST /auth/logout` `GET /auth/me` |
| 转换 | `POST /convert` `GET /task/:id` |
| 剧本 | `GET /scripts/by-task/:taskID` `GET /scripts/:id` `PUT /scripts/:id` `GET /scripts/:id/yaml` `GET /scripts/:id/characters` `GET /scripts/:id/scenes` |
| 场景 | `PUT /scripts/:id/scenes/:sid` `POST /scripts/:id/scenes/:sid/contents` `DELETE /scripts/:id/contents/:cid` |
| 作品 | `POST /works` `GET /works` `GET /works/stats` `GET /works/count` `GET /works/:id` `PUT /works/:id` `DELETE /works/:id` `GET /works/:id/scripts` |
| AI 增强 | `POST /scripts/:id/summary` `POST /scripts/:id/characters/appearance` `POST /scripts/:id/scenes/environment` `POST /works/:id/characters/profiles` |
| 灵感 | `GET/POST /inspiration/articles` `GET /inspiration/articles/:id` `POST /inspiration/articles/:id/like` `POST /inspiration/generate` `GET/POST /inspiration/topics` `GET /inspiration/topics/today` |
| AI 管理 | `GET/POST /ai/providers` `PUT /ai/providers/:id` `DELETE /ai/providers/:id` `PUT /ai/providers/:id/default` `POST /ai/providers/:id/test` |
| 管理 | `GET /admin/tasks` |

## License

Apache-2.0
