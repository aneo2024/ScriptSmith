# 剧匠 ScriptSmith

将小说文本通过 AI 转换为结构化 YAML 剧本，支持编辑、预览、角色/场景管理与导出。

## 技术栈

- Vite + React
- Ant Design
- CodeMirror（YAML 编辑）
- Vercel Serverless API（代理 OpenAI 兼容大模型，API Key 不暴露到浏览器）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入：

```env
AI_API_KEY=your-key
AI_API_URL=https://your-provider.com/v1
AI_MODEL=gpt-4o
```

### 3. 本地开发（含 AI API）

```bash
npm run vercel:dev
```

浏览器访问 Vercel Dev 提供的地址（通常为 `http://localhost:3000`）。

仅前端界面（无 AI 转换）：

```bash
npm run dev
```

需另开 `vercel dev` 或将 Vite 代理指向 API 端口（已在 `vite.config.js` 配置 `/api` → `127.0.0.1:3000`）。

### 4. 构建

```bash
npm run build
```

## 部署到 Vercel

1. 将仓库导入 [Vercel](https://vercel.com)
2. Framework Preset: **Vite**
3. 在项目 Settings → Environment Variables 添加：
   - `AI_API_KEY`
   - `AI_API_URL`
   - `AI_MODEL`
4. 部署：`vercel --prod` 或通过 Git 自动部署

**不要**将 `AI_API_KEY` 设为 `VITE_` 前缀变量。

## 功能清单

- [x] 小说文本输入与 AI 转换
- [x] YAML 语法高亮编辑
- [x] 标准剧本格式预览
- [x] 角色 / 场景 / 改编备注视图
- [x] 导出 `.yaml` 文件
- [x] LocalStorage 持久化
- [x] 服务端 API 代理

## 项目结构

```
src/
├── components/   # UI 组件
├── pages/        # 页面
├── hooks/        # useAIConvert, useLocalStorage
├── utils/        # schema, validators, prompt 重导出
├── services/     # aiService → /api/convert
api/
└── convert.js    # Vercel Serverless
shared/
└── promptTemplate.js
```

## License

Apache-2.0
