export interface SessionSummary {
  key: string;
  kind?: string;
  label?: string;
  displayName?: string;
  updatedAt?: number;
  sessionId?: string;
  modelProvider?: string;
  model?: string;
  derivedTitle?: string;
  lastMessagePreview?: string;
}

export interface SessionsListResponse {
  sessions: SessionSummary[];
}

export interface SubagentTreeNode {
  key: string;
  label: string;
  kind?: string;
  updatedAt?: number;
  sessionId?: string;
  model?: string;
  modelProvider?: string;
  agentId?: string;
  children: SubagentTreeNode[];
}

export interface SubagentTreeResult {
  root: SubagentTreeNode;
  totalNodes: number;
  totalEdges: number;
}
