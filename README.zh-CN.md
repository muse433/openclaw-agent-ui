# OpenClaw Agent 编排控制台

本仓库默认英文文档为主：

- English README: [README.md](./README.md)

`OpenClaw Agent Orchestration UI` 是一个面向开发与运维团队的多 Agent 控制台，围绕 OpenClaw Gateway 提供统一的可视化操作入口。项目目标是提升“编排可见性 + 配置变更安全性 + 日常维护效率”，帮助团队在真实环境下快速定位问题并稳定迭代。

---

## 目录

- [项目背景](#项目背景)
- [核心能力](#核心能力)
- [技术架构](#技术架构)
- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [接口概览](#接口概览)
- [流转图使用指南](#流转图使用指南)
- [开发脚本](#开发脚本)
- [工程约定](#工程约定)
- [常见问题](#常见问题)
- [参与贡献](#参与贡献)
- [许可证](#许可证)

---

## 项目背景

在多 Agent 系统中，难点往往不是单次模型调用，而是整体运营问题：

1. 多个 Agent 的人格文件、模型配置、运行目录如何统一管理？
2. Agent 之间如何派生、何时切换、为什么切换，如何快速看清？
3. bindings 与 config 如何在不中断业务的前提下安全更新？

本项目提供统一 Web 控制台，把这些高频操作放到同一个工程化界面中，减少散落在命令行和脚本之间的上下文切换成本。

---

## 核心能力

### 1) Agent 管理

- Agent 列表选择
- 创建 / 更新 / 删除 Agent
- 文件编辑（包含 `SOUL.md`）
- 模块内子标签：总览 / 生命周期 / 文件

### 2) 编排流转

- Bindings JSON 编辑、格式化、保存
- 子 Agent DAG 图谱展示
- 同 Agent 派生与跨 Agent 切换区分显示
- 流转明细侧栏：按边顺序显示 source -> target、层级、类型、模型
- 统计信息：节点、边、Agent 数、切换次数、层级深度

### 3) 配置治理

- 支持 `config.get / config.schema / config.set / config.patch / config.apply`
- 原始配置编辑 + Schema 预览 + 快捷配置（Model + SOUL）
- 基于 hash 的变更保护流程，降低盲写覆盖风险

### 4) 交互体验

- 左侧分组导航 + 模块子标签
- 可折叠侧边栏
- 响应式布局（桌面与小屏）

---

## 技术架构

### 服务端（`apps/server`）

- Fastify 提供 HTTP API
- Zod 进行参数与结构校验
- 统一封装 `openclaw gateway call` 调用
- 将 CLI 细节隔离在服务端边界

### 前端（`apps/web`）

- React 19 + TypeScript + Vite
- React Query 负责数据请求与状态管理
- React Flow 实现编排图谱与交互

### 架构意图

- 前后端职责清晰：服务端做能力代理，前端做操作与可视化
- 降低命令调用耦合，提升可维护性
- 面向长期迭代而不是一次性页面

---

## 目录结构

```text
apps/
  server/    Fastify API + OpenClaw 网关代理
  web/       React 可视化界面
tasks/
  todo.md    任务与 review 记录
```

---

## 快速开始

### 前置条件

- Node.js 22+
- npm 10+
- 本机可执行 `openclaw`
- 已准备好可用 OpenClaw 运行环境

### 安装

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

默认地址：

- Web: `http://127.0.0.1:5173`
- Server: `http://127.0.0.1:3001`

### 验证与构建

```bash
npm run lint
npm run test
npm run build
```

---

## 环境变量

- `OPENCLAW_BIN`：OpenClaw 可执行路径（默认 `openclaw`）
- `HOST`：服务监听地址（默认 `127.0.0.1`）
- `PORT`：服务端口（默认 `3001`）
- `VITE_API_BASE_URL`：前端 API 前缀（默认 `/api`）

---

## 接口概览

服务端封装并暴露以下网关能力：

- `agents.list / agents.create / agents.update / agents.delete`
- `agents.files.list / agents.files.get / agents.files.set`
- `models.list`
- `sessions.list`
- `config.get / config.schema / config.set / config.patch / config.apply`

组合接口：

- `GET /api/orchestration/bindings`
- `PUT /api/orchestration/bindings`
- `GET /api/orchestration/subagents/tree`

---

## 流转图使用指南

图谱模块是排查编排问题的核心入口：

### 边语义

- 蓝色边：同 Agent 派生
- 橙色边：跨 Agent 切换
- 边标签显示派生序号或切换类型

### 节点语义

- `ROOT`：根会话
- `Lx`：层级深度
- 节点内标签展示 agent、kind、model

### 右侧流转明细

- 按顺序列出每条流转边
- 快速定位切换发生点
- 同时展示层级、类型、模型信息

当你需要回答“这次输出是谁生成的”“什么时候发生了跨 Agent 跳转”“哪一跳导致链路变深”时，这个视图会非常直接。

---

## 开发脚本

根目录：

```bash
npm run dev
npm run lint
npm run test
npm run build
```

子项目：

```bash
npm run dev -w @openclaw-ui/server
npm run dev -w @openclaw-ui/web
```

---

## 工程约定

- 代码是事实来源，文档必须与实现一致
- 保持变更最小化，避免无关重构
- 提交前执行可验证步骤（lint/test/build）
- 通过清晰边界保持可维护性

---

## 常见问题

### 这个项目适合什么团队？

适合已经在使用 OpenClaw 进行多 Agent 编排，并且希望获得统一操作台的开发和运维团队。

### 这个项目会替代 OpenClaw CLI 吗？

不会。它与 CLI 互补：CLI 负责底层操作，UI 负责可见性、流程理解和日常管理效率。

### 能否扩展企业能力？

可以。常见扩展包括认证、审计、审批流程、环境隔离和发布策略。

### 图谱是否支持超大规模链路？

当前布局策略对常见规模可读性较好。若达到超大图规模，可在后续版本中引入更高级自动布局引擎。

---

## 参与贡献

欢迎提交 Issue 与 PR：

1. Fork 仓库
2. 新建分支
3. 提交变更并附验证说明
4. 发起 Pull Request

建议提交前缀：

- `feat:` 新功能
- `fix:` 修复
- `refactor:` 重构
- `docs:` 文档更新

---

## 许可证

默认建议使用 MIT，可根据组织需求调整。
