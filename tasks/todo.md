# Todo

- [x] 初始化 Monorepo 与基础依赖（web/server）
- [x] 实现后端 OpenClaw Gateway 代理层与 REST API
- [x] 实现 Agent 管理 UI（增删改查 + 文件编辑）
- [x] 实现编排 UI（bindings 编辑 + subagent DAG 可视化）
- [x] 实现配置 UI（config 读取/编辑/set/patch/apply）
- [x] 补充关键测试与运行文档

## Review

- 结果：`npm run test` 通过（3 files / 7 tests），`npm run build` 通过（server + web）。
- 关键验证点：bindings hash 冲突返回 409；subagent tree 缺参返回 400；gateway JSON 解析与树构建逻辑均有单测覆盖。
- 风险：前端 DAG 布局使用轻量层级算法，复杂大图可能出现交叉，需要后续引入自动布局引擎优化。
