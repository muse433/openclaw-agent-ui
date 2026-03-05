import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";

import {
  type ConfigGetResponse,
  type ConfigSchemaResponse,
  ensureObject,
} from "./config.js";
import { OpenClawGatewayClient } from "./openclawGateway.js";
import { buildSubagentTree } from "./orchestration.js";
import type { SessionsListResponse } from "./types.js";

const agentCreateSchema = z.object({
  name: z.string().min(1),
  workspace: z.string().min(1),
  emoji: z.string().optional(),
  avatar: z.string().optional(),
});

const agentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  workspace: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  avatar: z.string().optional(),
});

const configWriteSchema = z.object({
  raw: z.string().min(1),
  baseHash: z.string().min(1),
  sessionKey: z.string().optional(),
  note: z.string().optional(),
  restartDelayMs: z.number().int().nonnegative().optional(),
});

const bindingsWriteSchema = z.object({
  baseHash: z.string().min(1),
  bindings: z.array(z.unknown()),
});

function parseBool(value: unknown): boolean | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

interface GatewayLike {
  call<T>(method: string, params?: unknown): Promise<T>;
}

export function createApp(options?: { gateway?: GatewayLike }): ReturnType<typeof Fastify> {
  const app = Fastify({
    logger: true,
  });

  const gateway = options?.gateway ?? new OpenClawGatewayClient();

  void app.register(cors, {
    origin: true,
  });

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/agents", async () => {
    return gateway.call("agents.list", {});
  });

  app.post("/api/agents", async (request, reply) => {
    const parsed = agentCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.message });
    }

    return gateway.call("agents.create", parsed.data);
  });

  app.patch("/api/agents/:id", async (request, reply) => {
    const id = z.string().min(1).safeParse((request.params as { id?: string }).id);
    const body = agentUpdateSchema.safeParse(request.body);

    if (!id.success || !body.success) {
      return reply.code(400).send({ message: "参数不合法" });
    }

    return gateway.call("agents.update", {
      agentId: id.data,
      ...body.data,
    });
  });

  app.delete("/api/agents/:id", async (request, reply) => {
    const id = z.string().min(1).safeParse((request.params as { id?: string }).id);
    if (!id.success) {
      return reply.code(400).send({ message: "agent id 不能为空" });
    }

    const deleteFiles = parseBool((request.query as { deleteFiles?: string }).deleteFiles);

    return gateway.call("agents.delete", {
      agentId: id.data,
      ...(typeof deleteFiles === "boolean" ? { deleteFiles } : {}),
    });
  });

  app.get("/api/agents/:id/files", async (request, reply) => {
    const id = z.string().min(1).safeParse((request.params as { id?: string }).id);
    if (!id.success) {
      return reply.code(400).send({ message: "agent id 不能为空" });
    }

    return gateway.call("agents.files.list", {
      agentId: id.data,
    });
  });

  app.get("/api/agents/:id/files/:name", async (request, reply) => {
    const params = request.params as { id?: string; name?: string };
    if (!params.id || !params.name) {
      return reply.code(400).send({ message: "缺少路径参数" });
    }

    return gateway.call("agents.files.get", {
      agentId: params.id,
      name: decodeURIComponent(params.name),
    });
  });

  app.put("/api/agents/:id/files/:name", async (request, reply) => {
    const params = request.params as { id?: string; name?: string };
    const payload = z
      .object({
        content: z.string(),
      })
      .safeParse(request.body);

    if (!params.id || !params.name || !payload.success) {
      return reply.code(400).send({ message: "参数不合法" });
    }

    return gateway.call("agents.files.set", {
      agentId: params.id,
      name: decodeURIComponent(params.name),
      content: payload.data.content,
    });
  });

  app.get("/api/models", async () => {
    return gateway.call("models.list", {});
  });

  app.get("/api/sessions", async (request) => {
    const query = request.query as {
      limit?: string;
      activeMinutes?: string;
      search?: string;
      agentId?: string;
      spawnedBy?: string;
      includeDerivedTitles?: string;
      includeLastMessage?: string;
      includeGlobal?: string;
      includeUnknown?: string;
    };

    return gateway.call<SessionsListResponse>("sessions.list", {
      ...(query.limit ? { limit: Number(query.limit) } : {}),
      ...(query.activeMinutes ? { activeMinutes: Number(query.activeMinutes) } : {}),
      ...(query.search ? { search: query.search } : {}),
      ...(query.agentId ? { agentId: query.agentId } : {}),
      ...(query.spawnedBy ? { spawnedBy: query.spawnedBy } : {}),
      ...(typeof parseBool(query.includeDerivedTitles) === "boolean"
        ? { includeDerivedTitles: parseBool(query.includeDerivedTitles) }
        : {}),
      ...(typeof parseBool(query.includeLastMessage) === "boolean"
        ? { includeLastMessage: parseBool(query.includeLastMessage) }
        : {}),
      ...(typeof parseBool(query.includeGlobal) === "boolean"
        ? { includeGlobal: parseBool(query.includeGlobal) }
        : {}),
      ...(typeof parseBool(query.includeUnknown) === "boolean"
        ? { includeUnknown: parseBool(query.includeUnknown) }
        : {}),
    });
  });

  app.get("/api/orchestration/bindings", async () => {
    const config = await gateway.call<ConfigGetResponse>("config.get", {});
    const parsed = ensureObject(config.parsed);

    return {
      baseHash: config.hash,
      path: config.path,
      bindings: Array.isArray(parsed.bindings) ? parsed.bindings : [],
    };
  });

  app.put("/api/orchestration/bindings", async (request, reply) => {
    const payload = bindingsWriteSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({ message: payload.error.message });
    }

    const current = await gateway.call<ConfigGetResponse>("config.get", {});
    if (current.hash !== payload.data.baseHash) {
      return reply.code(409).send({
        message: "配置已变化，请刷新后重试",
        currentHash: current.hash,
      });
    }

    const nextConfig = {
      ...ensureObject(current.parsed),
      bindings: payload.data.bindings,
    };

    const writeResult = await gateway.call("config.set", {
      raw: JSON.stringify(nextConfig, null, 2),
      baseHash: current.hash,
    });

    const refreshed = await gateway.call<ConfigGetResponse>("config.get", {});

    return {
      result: writeResult,
      baseHash: refreshed.hash,
      bindings: payload.data.bindings,
    };
  });

  app.get("/api/orchestration/subagents/tree", async (request, reply) => {
    const rootKey = (request.query as { rootKey?: string }).rootKey;
    if (!rootKey) {
      return reply.code(400).send({ message: "rootKey 不能为空" });
    }

    const tree = await buildSubagentTree(gateway, rootKey);
    return tree;
  });

  app.get("/api/config", async () => {
    return gateway.call<ConfigGetResponse>("config.get", {});
  });

  app.get("/api/config/schema", async () => {
    return gateway.call<ConfigSchemaResponse>("config.schema", {});
  });

  app.put("/api/config/set", async (request, reply) => {
    const payload = configWriteSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({ message: payload.error.message });
    }

    return gateway.call("config.set", {
      raw: payload.data.raw,
      baseHash: payload.data.baseHash,
    });
  });

  app.post("/api/config/patch", async (request, reply) => {
    const payload = configWriteSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({ message: payload.error.message });
    }

    return gateway.call("config.patch", payload.data);
  });

  app.post("/api/config/apply", async (request, reply) => {
    const payload = configWriteSchema.safeParse(request.body);
    if (!payload.success) {
      return reply.code(400).send({ message: payload.error.message });
    }

    return gateway.call("config.apply", payload.data);
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const message = error instanceof Error ? error.message : "未知服务端错误";
    reply.code(500).send({
      message,
    });
  });

  return app;
}
