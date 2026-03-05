import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";

import { api } from "../lib/api";
import type { SubagentTreeNode } from "../types";

type OrchestrationSubTab = "rules" | "sessions" | "graph";

type FlowHop = {
  id: string;
  sourceLabel: string;
  sourceKey: string;
  sourceAgent?: string;
  targetLabel: string;
  targetKey: string;
  targetAgent?: string;
  kind?: string;
  model?: string;
  depth: number;
  handoff: boolean;
};

function agentColor(agentId?: string): string {
  if (!agentId) {
    return "#5f7080";
  }

  const palette = ["#2e6fa4", "#4d8b31", "#8a4db2", "#b86d1c", "#2a8c86", "#be4f53"];
  let hash = 0;

  for (let index = 0; index < agentId.length; index += 1) {
    hash = (hash * 31 + agentId.charCodeAt(index)) >>> 0;
  }

  return palette[hash % palette.length];
}

function toFlowData(root: SubagentTreeNode): {
  nodes: Node[];
  edges: Edge[];
  hops: FlowHop[];
  handoffCount: number;
  agentCount: number;
  depthCount: number;
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const hops: FlowHop[] = [];

  const depthRows = new Map<number, number>();
  const depthSet = new Set<number>();
  const agentSet = new Set<string>();

  const walk = (
    current: SubagentTreeNode,
    depth: number,
    parent?: SubagentTreeNode,
    childIndex = 0,
  ): void => {
    const row = depthRows.get(depth) ?? 0;
    depthRows.set(depth, row + 1);
    depthSet.add(depth);

    if (current.agentId) {
      agentSet.add(current.agentId);
    }

    const nodeAccent = agentColor(current.agentId);
    const isRoot = depth === 0;

    nodes.push({
      id: current.key,
      position: {
        x: depth * 350,
        y: row * 190,
      },
      data: {
        agentColor: nodeAccent,
        label: (
          <div className="flow-node">
            <div className="flow-node-top">
              <span className="flow-badge">{isRoot ? "ROOT" : `L${depth}`}</span>
              <strong>{current.label}</strong>
            </div>
            <small className="flow-key">{current.key}</small>
            <div className="flow-chip-row">
              {current.agentId ? (
                <span
                  className="flow-chip"
                  style={{
                    borderColor: `${nodeAccent}66`,
                    background: `${nodeAccent}1f`,
                    color: "#173247",
                  }}
                >
                  Agent: {current.agentId}
                </span>
              ) : null}
              {current.kind ? <span className="flow-chip">类型: {current.kind}</span> : null}
              {current.model ? <span className="flow-chip">Model: {current.model}</span> : null}
            </div>
          </div>
        ),
      },
      style: {
        borderRadius: 14,
        border: `1px solid ${nodeAccent}66`,
        background: "linear-gradient(145deg, #fffef8, #eff5ff)",
        boxShadow: "0 10px 24px rgba(13, 45, 78, 0.14)",
        width: 314,
      },
    });

    if (parent) {
      const handoff = Boolean(parent.agentId && current.agentId && parent.agentId !== current.agentId);
      const edgeColor = handoff ? "#c85b22" : "#2f6ca0";
      const edgeLabel = handoff ? "跨 Agent 切换" : `派生 #${childIndex + 1}`;

      edges.push({
        id: `${parent.key}->${current.key}`,
        source: parent.key,
        target: current.key,
        type: "smoothstep",
        animated: handoff,
        label: edgeLabel,
        labelStyle: {
          fontSize: 11,
          fill: handoff ? "#8a3d16" : "#1d4c73",
          fontWeight: 600,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
        style: {
          strokeWidth: handoff ? 2.2 : 1.8,
          stroke: edgeColor,
        },
      });

      hops.push({
        id: `${parent.key}->${current.key}`,
        sourceLabel: parent.label,
        sourceKey: parent.key,
        sourceAgent: parent.agentId,
        targetLabel: current.label,
        targetKey: current.key,
        targetAgent: current.agentId,
        kind: current.kind,
        model: current.model,
        depth,
        handoff,
      });
    }

    current.children.forEach((child, index) => {
      walk(child, depth + 1, current, index);
    });
  };

  walk(root, 0);

  return {
    nodes,
    edges,
    hops,
    handoffCount: hops.filter((hop) => hop.handoff).length,
    agentCount: agentSet.size,
    depthCount: depthSet.size,
  };
}

export function OrchestrationPanel({ subTab }: { subTab: OrchestrationSubTab }) {
  const queryClient = useQueryClient();

  const bindingsQuery = useQuery({
    queryKey: ["bindings"],
    queryFn: api.getBindings,
  });

  const [bindingsRaw, setBindingsRaw] = useState("[]");
  const [bindingsError, setBindingsError] = useState("");

  useEffect(() => {
    const next = bindingsQuery.data?.bindings ?? [];
    setBindingsRaw(JSON.stringify(next, null, 2));
  }, [bindingsQuery.data?.bindings]);

  const saveBindingsMutation = useMutation({
    mutationFn: (payload: { baseHash: string; bindings: unknown[] }) =>
      api.saveBindings(payload),
    onSuccess: async () => {
      setBindingsError("");
      await queryClient.invalidateQueries({ queryKey: ["bindings"] });
      await queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });

  const [sessionSearch, setSessionSearch] = useState("");
  const [rootKey, setRootKey] = useState("");

  const sessionsQuery = useQuery({
    queryKey: ["sessions", "roots", sessionSearch],
    queryFn: () =>
      api.getSessions({
        limit: 80,
        search: sessionSearch,
        includeDerivedTitles: true,
        includeLastMessage: false,
        includeUnknown: true,
      }),
  });

  useEffect(() => {
    if (!rootKey && sessionsQuery.data?.sessions.length) {
      setRootKey(sessionsQuery.data.sessions[0].key);
    }
  }, [rootKey, sessionsQuery.data?.sessions]);

  const treeQuery = useQuery({
    queryKey: ["subagent-tree", rootKey],
    queryFn: () => api.getSubagentTree(rootKey),
    enabled: Boolean(rootKey),
  });

  const flowData = useMemo(() => {
    if (!treeQuery.data?.root) {
      return {
        nodes: [] as Node[],
        edges: [] as Edge[],
        hops: [] as FlowHop[],
        handoffCount: 0,
        agentCount: 0,
        depthCount: 0,
      };
    }
    return toFlowData(treeQuery.data.root);
  }, [treeQuery.data?.root]);

  const onSaveBindings = (): void => {
    if (!bindingsQuery.data?.baseHash) {
      return;
    }

    try {
      const parsed = JSON.parse(bindingsRaw) as unknown;
      if (!Array.isArray(parsed)) {
        setBindingsError("bindings 必须是 JSON 数组");
        return;
      }

      saveBindingsMutation.mutate({
        baseHash: bindingsQuery.data.baseHash,
        bindings: parsed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setBindingsError(`JSON 解析失败: ${message}`);
    }
  };

  const onFormatBindings = (): void => {
    try {
      const parsed = JSON.parse(bindingsRaw) as unknown;
      setBindingsRaw(JSON.stringify(parsed, null, 2));
      setBindingsError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setBindingsError(`JSON 解析失败: ${message}`);
    }
  };

  const showRules = subTab === "rules";
  const showSessions = subTab === "sessions" || subTab === "graph";
  const showGraph = subTab === "graph";

  return (
    <div className="panel-grid">
      {showRules ? (
        <section className="card full-span">
          <div className="card-title">
            <h2>Bindings 编排编辑</h2>
            <p className="card-desc">直接维护路由规则，保存时自动校验 hash</p>
          </div>
          <div className="meta-row">
            <span>baseHash: {bindingsQuery.data?.baseHash ?? "-"}</span>
            <span>path: {bindingsQuery.data?.path ?? "-"}</span>
            <span>条目: {bindingsQuery.data?.bindings.length ?? 0}</span>
          </div>
          {bindingsError ? <p className="error-text">{bindingsError}</p> : null}
          <textarea
            value={bindingsRaw}
            onChange={(event) => setBindingsRaw(event.target.value)}
            rows={14}
          />
          <div className="button-row">
            <button type="button" onClick={onSaveBindings} disabled={saveBindingsMutation.isPending}>
              保存 Bindings
            </button>
            <button type="button" className="secondary" onClick={onFormatBindings}>
              格式化 JSON
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => bindingsQuery.refetch()}
              disabled={bindingsQuery.isFetching}
            >
              刷新
            </button>
          </div>
        </section>
      ) : null}

      {showSessions ? (
        <section className="card">
          <div className="card-title">
            <h2>选择根会话</h2>
            <p className="card-desc">按关键字筛选，点击会话即可生成子 Agent 树</p>
          </div>
          <label>
            搜索关键字
            <input
              value={sessionSearch}
              onChange={(event) => setSessionSearch(event.target.value)}
              placeholder="按 key / 标题搜索"
            />
          </label>
          <label>
            rootKey
            <input
              value={rootKey}
              onChange={(event) => setRootKey(event.target.value)}
              placeholder="agent:xxx:main"
            />
          </label>
          <div className="list-box compact">
            {(sessionsQuery.data?.sessions ?? []).map((session) => (
              <button
                type="button"
                key={session.key}
                className={session.key === rootKey ? "list-item active" : "list-item"}
                onClick={() => setRootKey(session.key)}
              >
                <span>{session.displayName || session.derivedTitle || session.label || session.key}</span>
                <small>{session.key}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {subTab === "sessions" ? (
        <section className="card">
          <div className="card-title">
            <h2>会话摘要</h2>
            <p className="card-desc">快速确认当前 rootKey 的拓扑规模</p>
          </div>
          <div className="meta-grid">
            <span>root: {rootKey || "-"}</span>
            <span>节点数: {treeQuery.data?.totalNodes ?? 0}</span>
            <span>边数: {treeQuery.data?.totalEdges ?? 0}</span>
            <span>加载状态: {treeQuery.isLoading ? "加载中" : "已完成"}</span>
          </div>
          {treeQuery.error ? <p className="error-text">{(treeQuery.error as Error).message}</p> : null}
        </section>
      ) : null}

      {showGraph ? (
        <section className="card full-span">
          <div className="card-title">
            <h2>Subagent DAG</h2>
            <p className="card-desc">箭头表示父会话 → 子会话，橙色连线表示跨 Agent 切换</p>
          </div>
          <div className="meta-row">
            <span>节点: {flowData.nodes.length}</span>
            <span>边: {flowData.edges.length}</span>
            <span>Agent: {flowData.agentCount}</span>
            <span>跨 Agent 切换: {flowData.handoffCount}</span>
            <span>层级: {flowData.depthCount}</span>
          </div>
          <div className="flow-legend">
            <span>
              <i className="legend-dot stable" /> 同 Agent 派生
            </span>
            <span>
              <i className="legend-dot handoff" /> 跨 Agent 切换
            </span>
          </div>
          {treeQuery.error ? <p className="error-text">{(treeQuery.error as Error).message}</p> : null}
          <div className="flow-layout">
            <div className="flow-shell">
              {treeQuery.isLoading ? <p>加载图数据中...</p> : null}
              {!treeQuery.isLoading && flowData.nodes.length === 0 ? (
                <p>请选择 rootKey 并加载子 Agent 树。</p>
              ) : null}
              {flowData.nodes.length ? (
                <ReactFlow nodes={flowData.nodes} edges={flowData.edges} fitView fitViewOptions={{ padding: 0.22 }}>
                  <Controls />
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) =>
                      ((node.data as { agentColor?: string })?.agentColor ?? "#4b6074") as string
                    }
                    maskColor="rgba(255, 248, 238, 0.7)"
                  />
                  <Background gap={22} size={1.2} color="#9ec4ec" />
                </ReactFlow>
              ) : null}
            </div>

            <aside className="flow-insight">
              <h3>流转明细</h3>
              <p>按父会话到子会话顺序展示，便于定位切换点。</p>
              <div className="flow-hop-list">
                {!flowData.hops.length ? <span className="flow-empty">暂无可展示的流转边</span> : null}
                {flowData.hops.map((hop, index) => (
                  <article key={hop.id} className={hop.handoff ? "flow-hop handoff" : "flow-hop"}>
                    <header>
                      <strong>#{index + 1}</strong>
                      <small>{hop.handoff ? "跨 Agent" : "同 Agent"}</small>
                    </header>
                    <p>
                      {hop.sourceLabel} <span>→</span> {hop.targetLabel}
                    </p>
                    <div className="flow-hop-meta">
                      <span>{hop.sourceAgent || "unknown"}</span>
                      <span>{hop.targetAgent || "unknown"}</span>
                    </div>
                    <div className="flow-hop-meta">
                      <span>层级 L{hop.depth}</span>
                      <span>{hop.kind ? `类型 ${hop.kind}` : "类型 -"}</span>
                      <span>{hop.model ? `模型 ${hop.model}` : "模型 -"}</span>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  );
}
