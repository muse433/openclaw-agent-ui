import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AgentsPanel } from "./components/AgentsPanel";
import { ConfigPanel } from "./components/ConfigPanel";
import { OrchestrationPanel } from "./components/OrchestrationPanel";
import { api } from "./lib/api";

type TabKey = "agents" | "orchestration" | "config";

const tabs: Array<{ key: TabKey; label: string; desc: string }> = [
  { key: "agents", label: "Agent 管理", desc: "生命周期与人格文件" },
  { key: "orchestration", label: "编排流转", desc: "Bindings 与子链路图" },
  { key: "config", label: "全局配置", desc: "Schema 与应用策略" },
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("agents");

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: api.getHealth,
    refetchInterval: 12_000,
  });

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: api.getAgents,
  });

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: api.getModels,
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions", "overview"],
    queryFn: () => api.getSessions({ limit: 200, includeUnknown: true }),
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">OpenClaw Agent Orchestration UI</p>
          <h1>Agent 编排控制台</h1>
          <p className="hero-note">
            面向运维与开发的实时控制面板，统一管理 Agent、路由绑定与运行配置。
          </p>
        </div>
        <div className="health-box">
          <span className={healthQuery.data?.ok ? "dot ok" : "dot bad"} />
          <span>{healthQuery.data?.ok ? "Gateway 在线" : "Gateway 未连接"}</span>
          {healthQuery.dataUpdatedAt ? (
            <small>{new Date(healthQuery.dataUpdatedAt).toLocaleTimeString("zh-CN")}</small>
          ) : null}
        </div>
      </header>

      <section className="overview-grid">
        <article className="overview-card">
          <small>Agent 总数</small>
          <strong>{agentsQuery.data?.agents.length ?? 0}</strong>
        </article>
        <article className="overview-card">
          <small>默认 Agent</small>
          <strong>{agentsQuery.data?.defaultId ?? "-"}</strong>
        </article>
        <article className="overview-card">
          <small>可选模型</small>
          <strong>{modelsQuery.data?.models.length ?? 0}</strong>
        </article>
        <article className="overview-card">
          <small>近期会话</small>
          <strong>{sessionsQuery.data?.sessions.length ?? 0}</strong>
        </article>
      </section>

      <nav className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab.key)}
          >
            <strong>{tab.label}</strong>
            <small>{tab.desc}</small>
          </button>
        ))}
      </nav>

      <main className="page-body">
        {activeTab === "agents" ? <AgentsPanel /> : null}
        {activeTab === "orchestration" ? <OrchestrationPanel /> : null}
        {activeTab === "config" ? <ConfigPanel /> : null}
      </main>
    </div>
  );
}
