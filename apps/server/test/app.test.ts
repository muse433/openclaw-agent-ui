import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

interface MockGateway {
  call<T>(method: string, params?: unknown): Promise<T>;
}

function createGateway(overrides?: {
  onCall?: (method: string, params?: unknown) => unknown;
}): MockGateway {
  return {
    async call<T>(method: string, params?: unknown): Promise<T> {
      if (overrides?.onCall) {
        return overrides.onCall(method, params) as T;
      }

      if (method === "config.get") {
        return {
          raw: "{}",
          parsed: {
            bindings: [{ from: "agent:writer", to: "agent:reviewer" }],
          },
          hash: "hash-1",
          path: "/tmp/openclaw-config.json",
        } as T;
      }

      if (method === "config.set") {
        return {
          ok: true,
        } as T;
      }

      if (method === "sessions.list") {
        const input = (params as { search?: string; spawnedBy?: string }) ?? {};
        if (input.search === "agent:main:main") {
          return {
            sessions: [{ key: "agent:main:main", displayName: "root" }],
          } as T;
        }

        if (input.spawnedBy === "agent:main:main") {
          return {
            sessions: [{ key: "agent:main:sub:1", displayName: "child" }],
          } as T;
        }

        return {
          sessions: [],
        } as T;
      }

      return {} as T;
    },
  };
}

const apps: Array<ReturnType<typeof createApp>> = [];

afterEach(async () => {
  while (apps.length) {
    const app = apps.pop();
    if (app) {
      await app.close();
    }
  }
});

describe("createApp routes", () => {
  it("GET /api/health 返回 ok", async () => {
    const app = createApp({ gateway: createGateway() });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it("GET /api/orchestration/bindings 返回 bindings 与 hash", async () => {
    const app = createApp({ gateway: createGateway() });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/orchestration/bindings",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      baseHash: "hash-1",
      bindings: [{ from: "agent:writer", to: "agent:reviewer" }],
    });
  });

  it("PUT /api/orchestration/bindings 在 hash 冲突时返回 409", async () => {
    const app = createApp({
      gateway: createGateway({
        onCall: (method) => {
          if (method === "config.get") {
            return {
              raw: "{}",
              parsed: { bindings: [] },
              hash: "new-hash",
            };
          }
          return {};
        },
      }),
    });
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/api/orchestration/bindings",
      payload: {
        baseHash: "old-hash",
        bindings: [],
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      message: "配置已变化，请刷新后重试",
      currentHash: "new-hash",
    });
  });

  it("GET /api/orchestration/subagents/tree 缺少 rootKey 时返回 400", async () => {
    const app = createApp({ gateway: createGateway() });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/orchestration/subagents/tree",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "rootKey 不能为空",
    });
  });
});
