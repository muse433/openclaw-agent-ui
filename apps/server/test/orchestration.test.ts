import { describe, expect, it } from "vitest";

import { buildSubagentTree } from "../src/orchestration.js";

const sessions = [
  {
    key: "agent:main:main",
    displayName: "root",
  },
  {
    key: "agent:main:subagent:1",
    displayName: "child-1",
  },
  {
    key: "agent:main:subagent:2",
    displayName: "child-2",
  },
  {
    key: "agent:main:subagent:3",
    displayName: "leaf",
  },
];

describe("buildSubagentTree", () => {
  it("应按 spawnedBy 关系构建树", async () => {
    const gateway = {
      call: async (method: string, params?: unknown) => {
        if (method !== "sessions.list") {
          return { sessions: [] };
        }

        const input = (params as { search?: string; spawnedBy?: string }) ?? {};
        if (input.search) {
          return { sessions: sessions.filter((s) => s.key === input.search) };
        }

        if (input.spawnedBy === "agent:main:main") {
          return { sessions: [sessions[1], sessions[2]] };
        }

        if (input.spawnedBy === "agent:main:subagent:1") {
          return { sessions: [sessions[3]] };
        }

        return { sessions: [] };
      },
    };

    const result = await buildSubagentTree(gateway, "agent:main:main");

    expect(result.root.key).toBe("agent:main:main");
    expect(result.root.children).toHaveLength(2);
    expect(result.root.children[0]?.children).toHaveLength(1);
    expect(result.totalNodes).toBe(4);
    expect(result.totalEdges).toBe(3);
  });
});
