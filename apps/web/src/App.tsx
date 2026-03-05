import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AgentsPanel } from "./components/AgentsPanel";
import { ConfigPanel } from "./components/ConfigPanel";
import { OrchestrationPanel } from "./components/OrchestrationPanel";
import { api } from "./lib/api";

type TabKey = "agents" | "orchestration" | "config";

type TabItem = {
  key: TabKey;
  label: string;
  desc: string;
  tag: string;
  icon: string;
};

type TabGroup = {
  title: string;
  note: string;
  items: TabItem[];
};

const tabGroups: TabGroup[] = [
  {
    title: "运营面板",
    note: "Control Deck",
    items: [
      {
        key: "agents",
        label: "Agent 管理",
        desc: "生命周期与人格文件",
        tag: "Core",
        icon: "AG",
      },
      {
        key: "orchestration",
        label: "编排流转",
        desc: "Bindings 与子链路图",
        tag: "Flow",
        icon: "DG",
      },
    ],
  },
  {
    title: "策略中心",
    note: "Policy Layer",
    items: [
      {
        key: "config",
        label: "全局配置",
        desc: "Schema 与应用策略",
        tag: "Guard",
        icon: "CF",
      },
    ],
  },
];

const tabMap = Object.fromEntries(
  tabGroups.flatMap((group) => group.items).map((item) => [item.key, item]),
) as Record<TabKey, TabItem>;

const agentsSubTabs = [
  { key: "overview", label: "总览", desc: "Agent 状态与当前选中", icon: "OV" },
  { key: "lifecycle", label: "生命周期", desc: "创建、编辑与删除", icon: "LC" },
  { key: "files", label: "文件", desc: "人格与运行文件", icon: "FS" },
] as const;

const orchestrationSubTabs = [
  { key: "rules", label: "规则", desc: "Bindings 编辑", icon: "RL" },
  { key: "sessions", label: "会话", desc: "选择 Root 会话", icon: "SS" },
  { key: "graph", label: "图谱", desc: "Subagent DAG", icon: "DG" },
] as const;

const configSubTabs = [
  { key: "editor", label: "编辑器", desc: "set / patch / apply", icon: "ED" },
  { key: "schema", label: "Schema", desc: "约束结构预览", icon: "SC" },
  { key: "quick", label: "快捷配置", desc: "Model + SOUL 同步", icon: "QK" },
] as const;

type AgentsSubTab = (typeof agentsSubTabs)[number]["key"];
type OrchestrationSubTab = (typeof orchestrationSubTabs)[number]["key"];
type ConfigSubTab = (typeof configSubTabs)[number]["key"];

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("agents");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [subTabs, setSubTabs] = useState<{
    agents: AgentsSubTab;
    orchestration: OrchestrationSubTab;
    config: ConfigSubTab;
  }>({
    agents: "overview",
    orchestration: "rules",
    config: "editor",
  });

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

  const activeTabMeta = tabMap[activeTab];

  const healthText = useMemo(
    () => (healthQuery.data?.ok ? "Gateway 在线" : "Gateway 未连接"),
    [healthQuery.data?.ok],
  );

  const activeSubTabs =
    activeTab === "agents"
      ? agentsSubTabs
      : activeTab === "orchestration"
        ? orchestrationSubTabs
        : configSubTabs;

  const activeSubTabKey =
    activeTab === "agents"
      ? subTabs.agents
      : activeTab === "orchestration"
        ? subTabs.orchestration
        : subTabs.config;

  const onChangeSubTab = (subTab: string): void => {
    if (activeTab === "agents") {
      setSubTabs((prev) => ({ ...prev, agents: subTab as AgentsSubTab }));
      return;
    }

    if (activeTab === "orchestration") {
      setSubTabs((prev) => ({ ...prev, orchestration: subTab as OrchestrationSubTab }));
      return;
    }

    setSubTabs((prev) => ({ ...prev, config: subTab as ConfigSubTab }));
  };

  return (
    <div className={sidebarCollapsed ? "app-shell shell-collapsed" : "app-shell"}>
      <aside className={sidebarCollapsed ? "sidebar collapsed" : "sidebar"}>
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <p className="eyebrow">OpenClaw Agent Orchestration UI</p>
            <h1>Agent 编排控制台</h1>
            <p className="hero-note">用一个界面完成 Agent 管理、流转编排与运行策略调整。</p>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
            aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <div className="health-box">
          <span className={healthQuery.data?.ok ? "dot ok" : "dot bad"} />
          <div className="health-copy">
            <strong>{healthText}</strong>
            {healthQuery.dataUpdatedAt ? (
              <small>{new Date(healthQuery.dataUpdatedAt).toLocaleTimeString("zh-CN")}</small>
            ) : null}
          </div>
        </div>

        <section className="sidebar-metrics">
          <article className="metric-card">
            <small>Agent</small>
            <strong>{agentsQuery.data?.agents.length ?? 0}</strong>
          </article>
          <article className="metric-card">
            <small>模型</small>
            <strong>{modelsQuery.data?.models.length ?? 0}</strong>
          </article>
          <article className="metric-card">
            <small>会话</small>
            <strong>{sessionsQuery.data?.sessions.length ?? 0}</strong>
          </article>
        </section>

        <nav className="sidebar-nav" aria-label="控制台导航">
          {tabGroups.map((group) => (
            <section key={group.title} className="nav-group">
              <p className="nav-note">{group.note}</p>
              <h2>{group.title}</h2>
              <div className="nav-stack">
                {group.items.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={activeTab === tab.key ? "sidebar-tab active" : "sidebar-tab"}
                    onClick={() => setActiveTab(tab.key)}
                    title={tab.label}
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    <span className="tab-copy">
                      <span className="tab-tag">{tab.tag}</span>
                      <strong>{tab.label}</strong>
                      <small>{tab.desc}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <p className="workspace-kicker">当前模块</p>
          <h2>{activeTabMeta.label}</h2>
          <p>{activeTabMeta.desc}</p>
        </header>

        <section className="module-tabs" aria-label="模块子标签">
          {activeSubTabs.map((subTab) => (
            <button
              key={subTab.key}
              type="button"
              className={activeSubTabKey === subTab.key ? "module-tab active" : "module-tab"}
              onClick={() => onChangeSubTab(subTab.key)}
            >
              <span className="module-tab-icon">{subTab.icon}</span>
              <span className="module-tab-copy">
                <strong>{subTab.label}</strong>
                <small>{subTab.desc}</small>
              </span>
            </button>
          ))}
        </section>

        <section className="page-body">
          {activeTab === "agents" ? <AgentsPanel subTab={subTabs.agents} /> : null}
          {activeTab === "orchestration" ? (
            <OrchestrationPanel subTab={subTabs.orchestration} />
          ) : null}
          {activeTab === "config" ? <ConfigPanel subTab={subTabs.config} /> : null}
        </section>
      </main>
    </div>
  );
}
