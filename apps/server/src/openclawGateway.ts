import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CommandOutput {
  stdout: string;
  stderr: string;
}

export type CommandRunner = (
  binary: string,
  args: string[],
) => Promise<CommandOutput>;

export class GatewayCallError extends Error {
  public readonly method: string;

  public constructor(method: string, message: string) {
    super(message);
    this.method = method;
    this.name = "GatewayCallError";
  }
}

export const defaultCommandRunner: CommandRunner = async (binary, args) => {
  const result = await execFileAsync(binary, args, {
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

export class OpenClawGatewayClient {
  private readonly binary: string;

  private readonly runner: CommandRunner;

  public constructor(options?: { binary?: string; runner?: CommandRunner }) {
    this.binary = options?.binary ?? process.env.OPENCLAW_BIN ?? "openclaw";
    this.runner = options?.runner ?? defaultCommandRunner;
  }

  public async call<T>(method: string, params: unknown = {}): Promise<T> {
    const args = [
      "gateway",
      "call",
      method,
      "--params",
      JSON.stringify(params),
      "--json",
    ];

    let output: CommandOutput;
    try {
      output = await this.runner(this.binary, args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GatewayCallError(method, `调用 openclaw 失败: ${message}`);
    }

    const stdout = output.stdout.trim();
    if (!stdout) {
      throw new GatewayCallError(
        method,
        output.stderr.trim() || "Gateway 未返回可解析数据",
      );
    }

    try {
      return JSON.parse(stdout) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GatewayCallError(
        method,
        `Gateway 返回非 JSON: ${message} | 原始输出: ${stdout.slice(0, 400)}`,
      );
    }
  }
}
