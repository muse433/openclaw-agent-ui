import type {
  SessionSummary,
  SessionsListResponse,
  SubagentTreeNode,
  SubagentTreeResult,
} from "./types.js";

interface GatewayLike {
  call<T>(method: string, params?: unknown): Promise<T>;
}

function parseAgentIdFromSessionKey(key: string): string | undefined {
  const match = /^agent:([^:]+):/.exec(key);
  return match?.[1];
}

function toNode(session: SessionSummary): SubagentTreeNode {
  return {
    key: session.key,
    label:
      session.derivedTitle ||
      session.displayName ||
      session.label ||
      session.key,
    kind: session.kind,
    updatedAt: session.updatedAt,
    sessionId: session.sessionId,
    model: session.model,
    modelProvider: session.modelProvider,
    agentId: parseAgentIdFromSessionKey(session.key),
    children: [],
  };
}

async function fetchChildren(
  gateway: GatewayLike,
  parentKey: string,
): Promise<SessionSummary[]> {
  const response = await gateway.call<SessionsListResponse>("sessions.list", {
    spawnedBy: parentKey,
    limit: 300,
    includeDerivedTitles: true,
    includeLastMessage: true,
  });

  return Array.isArray(response.sessions) ? response.sessions : [];
}

export async function buildSubagentTree(
  gateway: GatewayLike,
  rootKey: string,
): Promise<SubagentTreeResult> {
  const rootResponse = await gateway.call<SessionsListResponse>("sessions.list", {
    search: rootKey,
    limit: 400,
    includeGlobal: true,
    includeUnknown: true,
    includeDerivedTitles: true,
    includeLastMessage: true,
  });

  const rootSession = (rootResponse.sessions || []).find((item) => item.key === rootKey);
  if (!rootSession) {
    throw new Error(`未找到会话: ${rootKey}`);
  }

  const visited = new Set<string>();
  let totalNodes = 0;
  let totalEdges = 0;

  const dfs = async (session: SessionSummary): Promise<SubagentTreeNode> => {
    const node = toNode(session);
    visited.add(session.key);
    totalNodes += 1;

    const children = await fetchChildren(gateway, session.key);
    for (const child of children) {
      if (!child.key || visited.has(child.key)) {
        continue;
      }
      totalEdges += 1;
      node.children.push(await dfs(child));
    }

    return node;
  };

  const root = await dfs(rootSession);

  return {
    root,
    totalNodes,
    totalEdges,
  };
}
