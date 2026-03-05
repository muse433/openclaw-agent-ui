import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
} from "reactflow";

import { api } from "../lib/api";
import type { SubagentTreeNode } from "../types";

function toFlowElements(root: SubagentTreeNode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const depthRows = new Map<number, number>();

  const walk = (current: SubagentTreeNode, depth: number, parentId?: string): void => {
    const row = depthRows.get(depth) ?? 0;
    depthRows.set(depth, row + 1);

    const subtitle = [
      current.kind ? `类型: ${current.kind}` : "",
      current.agentId ? `Agent: ${current.agentId}` : "",
      current.model ? `Model: ${current.model}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    nodes.push({
      id: current.key,
      position: {
        x: depth * 320,
        y: row * 150,
      },
      data: {
        label: (
          <div className="flow-node">
            <strong>{current.label}</strong>
            <small>{current.key}</small>
            {subtitle ? <small>{subtitle}</small> : null}
          </div>
        ),
      },
      style: {
        borderRadius: 14,
        border: "1px solid #1b3555",
        background: "linear-gradient(145deg, #fffef7, #e8f3ff)",
        boxShadow: "0 6px 20px rgba(11, 53, 93, 0.12)",
        width: 280,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}->${current.key}`,
        source: parentId,
        target: current.key,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#20568e",
        },
        style: {
          strokeWidth: 1.7,
          stroke: "#20568e",
        },
      });
    }

    current.children.forEach((child) => {
      walk(child, depth + 1, current.key);
    });
  };

  walk(root, 0);
  return { nodes, edges };
}

export function OrchestrationPanel() {
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

  const flowElements = useMemo(() => {
    if (!treeQuery.data?.root) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }
    return toFlowElements(treeQuery.data.root);
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

  return (
    <div className="panel-grid">
      <section className="card">
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

      <section className="card full-span">
        <div className="card-title">
          <h2>Subagent DAG</h2>
          <p className="card-desc">展示会话派生关系，节点可拖拽查看</p>
        </div>
        <div className="meta-row">
          <span>节点: {treeQuery.data?.totalNodes ?? 0}</span>
          <span>边: {treeQuery.data?.totalEdges ?? 0}</span>
          <span>root: {rootKey || "-"}</span>
        </div>
        {treeQuery.error ? (
          <p className="error-text">
            {(treeQuery.error as Error).message}
          </p>
        ) : null}
        <div className="flow-shell">
          {treeQuery.isLoading ? <p>加载图数据中...</p> : null}
          {!treeQuery.isLoading && flowElements.nodes.length === 0 ? (
            <p>请选择 rootKey 并加载子 Agent 树。</p>
          ) : null}
          {flowElements.nodes.length ? (
            <ReactFlow nodes={flowElements.nodes} edges={flowElements.edges} fitView>
              <Controls />
              <Background gap={20} size={1.2} color="#9ec4ec" />
            </ReactFlow>
          ) : null}
        </div>
      </section>
    </div>
  );
}
