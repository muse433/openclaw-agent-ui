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

## 2026-03-05 UI Redesign

- [x] 将顶部导航改为左侧分组式多 tab 导航（运营面板 / 策略中心）
- [x] 重构页面壳层为 Sidebar + Workspace 双栏布局，并加入状态与指标模块
- [x] 全量升级 `main.css` 视觉体系（字体、配色、层次、动效、响应式）
- [x] 执行前端构建验证，确保改版不破坏类型检查与打包

### Review

- 验证命令：`npm run lint -w @openclaw-ui/web`、`npm run build -w @openclaw-ui/web`
- 验证结果：类型检查通过，构建成功，Vite 产物正常输出（CSS/JS 均生成）
- 残余风险：本次主要变更为壳层与样式，业务逻辑未改；建议人工在移动端和深色环境下进行一次视觉走查

## 2026-03-05 Sidebar + Subtabs

- [x] 新增可折叠侧边栏，支持图标化导航与折叠态信息压缩
- [x] 新增模块级子标签条（Agents / Orchestration / Config 各自 3 个子标签）
- [x] 三个面板组件按子标签进行受控渲染（保持原业务行为不变）
- [x] 重构样式系统，补充折叠态、图标、子标签、响应式细节
- [x] 重新执行类型检查与前端构建验证

### Review

- 验证命令：`npm run lint -w @openclaw-ui/web`、`npm run build -w @openclaw-ui/web`
- 验证结果：通过，前端产物可正常构建
- 风险提示：移动端折叠态会在媒体查询下回退为展开视觉，建议在真实设备进行一次交互验证

## 2026-03-05 Agent Flow Visibility

- [x] 重构 DAG 生成逻辑：节点强化 Agent/类型/模型标签，连线显示派生关系与跨 Agent 切换
- [x] 引入流转明细侧栏（按边顺序展示 source -> target、层级、类型、模型）
- [x] 增加图例与统计指标（节点/边/Agent 数/跨 Agent 切换数/层级数）
- [x] 调整 Flow 区域布局和样式（大画布 + 右侧明细 + MiniMap）
- [x] 完成类型检查和构建验证

### Review

- 验证命令：`npm run lint -w @openclaw-ui/web`、`npm run build -w @openclaw-ui/web`
- 验证结果：通过，图谱模块改动可编译并打包
- 风险提示：当前依旧使用轻量树形布局，超大规模树（数百节点）可能需要后续接入自动布局引擎
