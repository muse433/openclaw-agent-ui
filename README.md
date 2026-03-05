# OpenClaw Agent Orchestration UI

基于 OpenClaw Gateway 的可视化编排与配置管理界面，提供：

- Agent 管理：创建、修改、删除、文件编辑（含 `SOUL.md`）。
- 编排管理：`bindings` JSON 编辑保存、Subagent 树形 DAG 可视化。
- 配置管理：`config.get`/`config.schema`/`config.set`/`config.patch`/`config.apply`。

## 目录结构

```text
apps/
  server/   # Fastify API，代理 openclaw gateway call
  web/      # React + Vite 可视化界面
tasks/
  todo.md   # 任务追踪
```

## 前置条件

- Node.js 22+
- npm 10+
- 已安装并可执行 `openclaw` 命令，且本机已有可用 OpenClaw 配置

## 启动

```bash
npm install
npm run dev
```

默认地址：

- Web: `http://127.0.0.1:5173`
- Server: `http://127.0.0.1:3001`

## 构建与测试

```bash
npm run test
npm run build
```

## 环境变量

- `OPENCLAW_BIN`：OpenClaw 可执行文件路径（默认 `openclaw`）
- `HOST`：Server 监听地址（默认 `127.0.0.1`）
- `PORT`：Server 端口（默认 `3001`）
- `VITE_API_BASE_URL`：前端 API 前缀（默认 `/api`）

## API 概览

服务端通过 `openclaw gateway call <method> --params ... --json` 统一调用，已封装：

- `agents.list/create/update/delete`
- `agents.files.list/get/set`
- `models.list`
- `sessions.list`
- `config.get/schema/set/patch/apply`

以及组合接口：

- `GET/PUT /api/orchestration/bindings`
- `GET /api/orchestration/subagents/tree`
