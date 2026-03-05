# OpenClaw Agent Orchestration UI | OpenClaw Agent 编排控制台

> Bilingual README (中文 + English) for **OpenClaw Agent Orchestration**, **multi-agent workflow visualization**, **OpenClaw Gateway management**, and **developer operations dashboard**.

OpenClaw Agent Orchestration UI 是一个面向开发者与运维团队的可视化控制台，围绕 OpenClaw Gateway 提供 **Agent 生命周期管理**、**多 Agent 编排流转可视化**、**配置治理与策略发布** 三类核心能力。项目定位是“可落地、可扩展、可审计”的工程化界面，而不是仅用于演示的管理页面。

OpenClaw Agent Orchestration UI is a production-oriented dashboard for OpenClaw Gateway, designed for developer teams and operators. It provides three core capabilities: **Agent lifecycle management**, **multi-agent orchestration flow visualization**, and **configuration governance with controlled rollout**.

---

## 目录 | Table of Contents

- [项目定位 | Project Positioning](#项目定位--project-positioning)
- [核心特性 | Key Features](#核心特性--key-features)
- [技术架构 | Architecture](#技术架构--architecture)
- [使用场景 | Use Cases](#使用场景--use-cases)
- [快速开始 | Quick Start](#快速开始--quick-start)
- [环境变量 | Environment Variables](#环境变量--environment-variables)
- [API 概览 | API Overview](#api-概览--api-overview)
- [编排可视化说明 | Flow Visualization Guide](#编排可视化说明--flow-visualization-guide)
- [开发脚本 | Scripts](#开发脚本--scripts)
- [工程约定 | Engineering Conventions](#工程约定--engineering-conventions)
- [SEO 关键词 FAQ | SEO FAQ](#seo-关键词-faq--seo-faq)
- [开源协作 | Contributing](#开源协作--contributing)
- [许可证 | License](#许可证--license)

---

## 项目定位 | Project Positioning

### 中文

在真实的多 Agent 系统中，常见问题不是“如何调用一个模型”，而是：

1. 如何管理多个 Agent 的人格文件、模型参数、运行目录？
2. 如何看清 Agent 之间的派生关系、跨 Agent 切换、流转路径？
3. 如何在不破坏线上状态的前提下，安全地修改 bindings 和 config？

本项目针对这些问题提供了统一入口。通过一个 Web UI，团队可以完成从 Agent 管理到编排观察，再到配置治理的闭环流程，减少命令行分散操作带来的信息断层。

### English

In real-world multi-agent systems, the hard part is rarely “calling a model once.” The real challenge is:

1. How to manage agent identity files, model options, and workspaces at scale.
2. How to understand derivation paths, cross-agent handoffs, and orchestration topology.
3. How to update bindings and config safely without breaking runtime stability.

This project provides a single operational surface for these concerns.

---

## 核心特性 | Key Features

### 1) Agent 管理 | Agent Management

- Agent 列表浏览与选择
- 创建 / 更新 / 删除 Agent
- 文件管理：直接编辑 `SOUL.md` 及其它运行文件
- Agent 概览与生命周期操作分离（子标签）

### 2) 编排流转 | Orchestration Flow

- Bindings JSON 编辑、格式化、保存
- 子 Agent DAG 可视化（React Flow）
- **跨 Agent 切换高亮**：同 Agent 派生与 handoff 直观区分
- 流转明细侧栏：逐条显示 source -> target、层级、类型、模型
- 节点/边/Agent 数量、切换次数、层级等统计指标

### 3) 配置治理 | Config Governance

- `config.get / config.schema / config.set / config.patch / config.apply`
- 原始配置编辑器 + Schema 预览 + 快捷配置（Model + SOUL）
- 使用 baseHash 做并发保护，避免盲写覆盖

### 4) 现代前端体验 | Modern UX

- 左侧多分组导航 + 子标签导航
- 可折叠侧边栏（高密度模式）
- 适配桌面与移动端响应式布局

---

## 技术架构 | Architecture

```text
apps/
  server/   Fastify + Zod
            统一代理 openclaw gateway call
            提供 REST API 与参数校验

  web/      React 19 + Vite + TypeScript
            React Query 数据拉取与缓存
            React Flow 编排图谱可视化

tasks/
  todo.md   任务记录与 review 轨迹
```

### Backend（`apps/server`）

- Fastify 提供 HTTP API
- Zod 做请求参数与结构校验
- 统一封装 `openclaw gateway call <method> --params ... --json`
- 对前端屏蔽命令调用细节，提供稳定 REST 边界

### Frontend（`apps/web`）

- React + TypeScript 保持强类型 UI 开发
- React Query 管理请求状态与刷新节奏
- React Flow 构建可拖拽编排图，增强多 Agent 流转可读性

---

## 使用场景 | Use Cases

### 场景 A：多 Agent 团队运营

你需要维护多个角色 Agent（例如客服、写作、代码、审核）。使用本项目可以在统一面板快速切换 Agent，调整模型与人格文件，并追踪每个会话的派生路径。

### 场景 B：编排规则迭代

当你修改 bindings 后，通常需要验证“路由是否按预期发生”。本项目将规则编辑与 DAG 观察放在同一域内，降低回归成本。

### 场景 C：线上配置安全发布

通过 config hash 与分步操作（set/patch/apply），可以以更可控的方式推进配置变更，减少误操作风险。

---

## 快速开始 | Quick Start

### 前置条件 | Prerequisites

- Node.js 22+
- npm 10+
- 本机可执行 `openclaw`
- 已有可用 OpenClaw 配置

### 安装与启动 | Install & Run

```bash
npm install
npm run dev
```

默认地址 | Default endpoints:

- Web: `http://127.0.0.1:5173`
- Server: `http://127.0.0.1:3001`

### 构建与测试 | Build & Test

```bash
npm run lint
npm run test
npm run build
```

---

## 环境变量 | Environment Variables

- `OPENCLAW_BIN`: OpenClaw 可执行文件路径（默认 `openclaw`）
- `HOST`: Server 监听地址（默认 `127.0.0.1`）
- `PORT`: Server 端口（默认 `3001`）
- `VITE_API_BASE_URL`: Web API 前缀（默认 `/api`）

---

## API 概览 | API Overview

服务端代理 OpenClaw Gateway 常用方法：

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

## 编排可视化说明 | Flow Visualization Guide

### 中文

图谱中每条边都不是装饰，而是一个“可解释的派生关系”。

- 蓝色边：同 Agent 派生
- 橙色边：跨 Agent 切换（handoff）
- `ROOT` 节点：当前根会话
- `Lx`：节点层级深度
- 右侧“流转明细”：按顺序列出每条边，方便定位路由断点

这能帮助团队回答三个高频问题：

1. 这次响应到底由哪个 Agent 产出？
2. 是不是发生了意外的跨 Agent 跳转？
3. 当前 bindings 是否导致了过深链路或重复派生？

### English

Every edge in the graph is an explainable derivation path:

- Blue edge: same-agent derivation
- Orange edge: cross-agent handoff
- `ROOT`: current root session
- `Lx`: depth level
- Right-side panel: ordered flow hops for fast debugging

---

## 开发脚本 | Scripts

根目录：

```bash
npm run dev     # start web + server
npm run lint    # web type-check
npm run test    # server tests
npm run build   # build server + web
```

子项目：

```bash
npm run dev -w @openclaw-ui/server
npm run dev -w @openclaw-ui/web
```

---

## 工程约定 | Engineering Conventions

- 代码优先于文档：文档必须反映真实实现
- 保持强类型：TypeScript 严格模式
- 变更可验证：提交前执行 `lint/test/build`
- 最小影响范围：优先局部改动，避免无关重构

---

## SEO 关键词 FAQ | SEO FAQ

### Q1: 什么是 OpenClaw Agent Orchestration UI？

它是一个面向 OpenClaw Gateway 的可视化编排控制台，支持 Agent 管理、工作流可视化、配置治理，适用于多 Agent 开发与运维团队。

### Q2: 如何可视化多 Agent 的流转链路？

通过内置 DAG 图谱与流转明细侧栏，你可以清晰看到父子会话关系、跨 Agent handoff、层级深度与关键模型信息。

### Q3: 这个项目适合做什么？

适合做 **multi-agent orchestration dashboard**、**LLM agent operations UI**、**OpenClaw workflow visualization tool**、**agent governance panel** 等场景。

### Q4: Can I use it as an open-source admin panel for AI agents?

Yes. You can use it as a base for an open-source AI agent control plane, then extend RBAC, audit logs, notifications, or deployment hooks for enterprise needs.

### Q5: 项目是否支持生产环境？

当前实现已经具备工程化基础能力，但你仍需要根据组织要求补充认证、审计、发布流程、异常告警等生产化模块。

---

## 开源协作 | Contributing

欢迎提交 Issue / PR：

1. Fork 仓库
2. 新建特性分支
3. 提交变更并附上验证步骤
4. 发起 Pull Request

建议提交格式：

- `feat:` 新功能
- `fix:` 缺陷修复
- `refactor:` 重构（无行为变化）
- `docs:` 文档更新

---

## 许可证 | License

建议使用 MIT License（如用于企业内部可按需替换）。

If you plan to adopt this project for public use, MIT is usually a practical default.

---

## Keywords (for discoverability)

OpenClaw, OpenClaw Gateway, Agent Orchestration, Multi-Agent Workflow, AI Agent Dashboard, LLM Agent Management, Agent Flow Visualization, Agent Control Panel, Workflow Governance, Developer Operations UI, 编排控制台, 多 Agent 管理, Agent 流转可视化, 配置治理平台。
