import { describe, expect, it } from "vitest";

import { GatewayCallError, OpenClawGatewayClient } from "../src/openclawGateway.js";

describe("OpenClawGatewayClient", () => {
  it("应当正确解析 JSON 输出", async () => {
    const client = new OpenClawGatewayClient({
      runner: async () => ({
        stdout: '{"ok":true}',
        stderr: "",
      }),
    });

    const result = await client.call<{ ok: boolean }>("health", {});
    expect(result.ok).toBe(true);
  });

  it("输出非 JSON 时应抛出错误", async () => {
    const client = new OpenClawGatewayClient({
      runner: async () => ({
        stdout: "not-json",
        stderr: "",
      }),
    });

    await expect(client.call("health", {})).rejects.toBeInstanceOf(GatewayCallError);
  });
});
