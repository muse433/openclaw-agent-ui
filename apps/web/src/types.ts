export interface AgentSummary {
  id: string;
  name?: string;
}

export interface AgentsListResponse {
  defaultId: string;
  agents: AgentSummary[];
}

export interface AgentFileEntry {
  name: string;
  path: string;
  missing: boolean;
  content?: string;
}

export interface AgentFilesListResponse {
  agentId: string;
  workspace: string;
  files: AgentFileEntry[];
}

export interface AgentFileGetResponse {
  agentId: string;
  workspace: string;
  file: AgentFileEntry;
}

export interface SessionsListResponse {
  sessions: Array<{
    key: string;
    kind?: string;
    label?: string;
    displayName?: string;
    updatedAt?: number;
    model?: string;
    modelProvider?: string;
    derivedTitle?: string;
    lastMessagePreview?: string;
  }>;
}

export interface SubagentTreeNode {
  key: string;
  label: string;
  kind?: string;
  updatedAt?: number;
  model?: string;
  modelProvider?: string;
  agentId?: string;
  children: SubagentTreeNode[];
}

export interface SubagentTreeResponse {
  root: SubagentTreeNode;
  totalNodes: number;
  totalEdges: number;
}

export interface ConfigGetResponse {
  raw: string;
  parsed: Record<string, unknown>;
  hash: string;
  path?: string;
}

export interface ConfigSchemaResponse {
  schema: Record<string, unknown>;
  uiHints?: Record<string, unknown>;
  version?: string;
  generatedAt?: string;
}

export interface BindingsResponse {
  baseHash: string;
  path?: string;
  bindings: unknown[];
}

export interface ModelsListResponse {
  models: Array<{
    id: string;
    provider?: string;
  }>;
}

export interface HealthResponse {
  ok: boolean;
}
