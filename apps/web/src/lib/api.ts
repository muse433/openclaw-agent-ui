import type {
  AgentFileGetResponse,
  AgentFilesListResponse,
  AgentsListResponse,
  BindingsResponse,
  ConfigGetResponse,
  ConfigSchemaResponse,
  HealthResponse,
  ModelsListResponse,
  SessionsListResponse,
  SubagentTreeResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  getHealth: () => request<HealthResponse>("/health"),
  getAgents: () => request<AgentsListResponse>("/agents"),
  createAgent: (payload: {
    name: string;
    workspace: string;
    emoji?: string;
    avatar?: string;
  }) =>
    request("/agents", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAgent: (
    id: string,
    payload: {
      name?: string;
      workspace?: string;
      model?: string;
      avatar?: string;
    },
  ) =>
    request(`/agents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAgent: (id: string, deleteFiles: boolean) =>
    request(`/agents/${encodeURIComponent(id)}?deleteFiles=${String(deleteFiles)}`, {
      method: "DELETE",
    }),
  getAgentFiles: (id: string) =>
    request<AgentFilesListResponse>(`/agents/${encodeURIComponent(id)}/files`),
  getAgentFile: (id: string, name: string) =>
    request<AgentFileGetResponse>(
      `/agents/${encodeURIComponent(id)}/files/${encodeURIComponent(name)}`,
    ),
  setAgentFile: (id: string, name: string, content: string) =>
    request(`/agents/${encodeURIComponent(id)}/files/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  getModels: () => request<ModelsListResponse>("/models"),
  getSessions: (params: Record<string, string | number | boolean | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") {
        continue;
      }
      query.set(key, String(value));
    }
    return request<SessionsListResponse>(`/sessions?${query.toString()}`);
  },
  getBindings: () => request<BindingsResponse>("/orchestration/bindings"),
  saveBindings: (payload: { baseHash: string; bindings: unknown[] }) =>
    request<{ baseHash: string; bindings: unknown[] }>("/orchestration/bindings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getSubagentTree: (rootKey: string) =>
    request<SubagentTreeResponse>(
      `/orchestration/subagents/tree?rootKey=${encodeURIComponent(rootKey)}`,
    ),
  getConfig: () => request<ConfigGetResponse>("/config"),
  getConfigSchema: () => request<ConfigSchemaResponse>("/config/schema"),
  configSet: (payload: { raw: string; baseHash: string }) =>
    request("/config/set", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  configPatch: (payload: {
    raw: string;
    baseHash: string;
    sessionKey?: string;
    note?: string;
    restartDelayMs?: number;
  }) =>
    request("/config/patch", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  configApply: (payload: {
    raw: string;
    baseHash: string;
    sessionKey?: string;
    note?: string;
    restartDelayMs?: number;
  }) =>
    request("/config/apply", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
