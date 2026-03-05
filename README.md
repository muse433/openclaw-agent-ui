# OpenClaw Agent Orchestration UI

English documentation is the default in this repository.

- Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

OpenClaw Agent Orchestration UI is a practical control plane for teams running multi-agent systems with OpenClaw Gateway. It focuses on operational clarity, safe configuration changes, and visual orchestration understanding.

This project helps engineering teams answer real production questions:

1. Which agent produced this response?
2. Where did a cross-agent handoff happen?
3. What changed in routing bindings or runtime configuration?
4. Can we update config safely without blind overwrite?

The UI is designed for day-to-day usage by developers and operators, not only for demos.

---

## Table of Contents

- [Why This Project](#why-this-project)
- [Key Capabilities](#key-capabilities)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Server API Overview](#server-api-overview)
- [Flow Visualization Guide](#flow-visualization-guide)
- [Development Scripts](#development-scripts)
- [Engineering Notes](#engineering-notes)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Why This Project

In many agent platforms, the hard part is not sending one model request. The hard part is operations:

- Managing multiple agents and their identity files.
- Tracking agent-to-agent routing decisions.
- Editing bindings and config with low risk.
- Keeping a clear view of system state while moving fast.

OpenClaw Agent Orchestration UI provides one place to do all of this.

---

## Key Capabilities

### 1) Agent Management

- List and select agents.
- Create, update, and delete agents.
- Edit runtime files directly, including `SOUL.md`.
- Separate views for overview, lifecycle actions, and files.

### 2) Orchestration and Routing

- Edit bindings JSON with format and save actions.
- Visualize sub-agent graph using React Flow.
- Highlight same-agent derivation vs cross-agent handoff.
- See ordered hop details to debug flow transitions.
- View metrics: node count, edge count, agent count, handoff count, depth.

### 3) Configuration Governance

- Support `config.get`, `config.schema`, `config.set`, `config.patch`, `config.apply`.
- Show raw config editor and schema view.
- Provide quick agent config update flow (model + file content).
- Respect `baseHash` flow to reduce overwrite risk.

### 4) Operator-Friendly UI

- Sidebar with grouped tabs.
- Module-level sub-tabs.
- Collapsible sidebar for dense workflows.
- Responsive layout for desktop and smaller screens.

---

## Architecture

### Backend (`apps/server`)

- Fastify server with Zod validation.
- Unified adapter around `openclaw gateway call`.
- REST layer for the web client.
- Validation and error handling at API boundary.

### Frontend (`apps/web`)

- React 19 + TypeScript + Vite.
- React Query for data synchronization.
- React Flow for graph rendering and interaction.
- Structured tabs for operational workflows.

### Why this split

- Keep OpenClaw command execution in server scope.
- Keep UI focused on interaction and status visibility.
- Reduce coupling between rendering and CLI behavior.

---

## Project Structure

```text
apps/
  server/    Fastify API + OpenClaw gateway adapter
  web/       React UI + orchestration graph
tasks/
  todo.md    Task tracking and review notes
```

---

## Quick Start

### Prerequisites

- Node.js 22+
- npm 10+
- `openclaw` available in local environment
- A valid OpenClaw runtime/config setup

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

Default endpoints:

- Web: `http://127.0.0.1:5173`
- Server: `http://127.0.0.1:3001`

### Validate and build

```bash
npm run lint
npm run test
npm run build
```

---

## Environment Variables

- `OPENCLAW_BIN`: OpenClaw executable path (default: `openclaw`)
- `HOST`: server host (default: `127.0.0.1`)
- `PORT`: server port (default: `3001`)
- `VITE_API_BASE_URL`: web API base (default: `/api`)

---

## Server API Overview

Gateway-aligned methods used by server:

- `agents.list`, `agents.create`, `agents.update`, `agents.delete`
- `agents.files.list`, `agents.files.get`, `agents.files.set`
- `models.list`
- `sessions.list`
- `config.get`, `config.schema`, `config.set`, `config.patch`, `config.apply`

Composed endpoints:

- `GET /api/orchestration/bindings`
- `PUT /api/orchestration/bindings`
- `GET /api/orchestration/subagents/tree`

---

## Flow Visualization Guide

The graph view is intentionally built for debugging real routing behavior.

### Edge semantics

- Blue edge: same-agent derivation path.
- Orange edge: cross-agent handoff.
- Edge labels indicate derivation order or handoff type.

### Node semantics

- `ROOT` marks the root session node.
- `Lx` shows depth level in the derivation tree.
- Chips display agent id, node kind, and model when available.

### Right-side flow insights

- Ordered hop list from source to target.
- Quick visibility of where handoff occurs.
- Compact metadata for depth, kind, and model.

This makes it easier to answer:

- Where did the flow diverge?
- Which transition introduced a different agent?
- Is the current chain too deep for expected behavior?

---

## Development Scripts

From repository root:

```bash
npm run dev
npm run lint
npm run test
npm run build
```

Run sub-project scripts directly:

```bash
npm run dev -w @openclaw-ui/server
npm run dev -w @openclaw-ui/web
```

---

## Engineering Notes

- Code is the source of truth.
- Keep changes minimal and verifiable.
- Prefer explicit API boundaries over implicit coupling.
- Validate before commit (`lint/test/build`).
- Keep UI states explainable for operator workflows.

---

## FAQ

### What is this project best used for?

It is best for teams who already run OpenClaw-based agent workflows and want a clearer operational dashboard for routing, config updates, and agent maintenance.

### Is this only for demos?

No. The structure and UX target real development and operations workflows.

### Does it replace OpenClaw CLI?

No. It complements CLI operations by adding visual control, discoverability, and easier status tracking.

### Can I extend it for enterprise workflows?

Yes. Common extensions include authentication, audit logging, approvals, and environment-specific deployment policies.

### Is the graph layout optimized for huge trees?

Current layout is lightweight and readable for typical usage. Very large graphs may need advanced auto-layout integration in future versions.

---

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Add changes with verification details.
4. Open a pull request.

Recommended commit prefixes:

- `feat:` new feature
- `fix:` bug fix
- `refactor:` structural improvement without behavior change
- `docs:` documentation update

---

## License

MIT is a practical default for open-source usage. Adjust as needed for your organization.
