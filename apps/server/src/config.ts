export interface ConfigGetResponse {
  raw: string;
  parsed: Record<string, unknown>;
  hash: string;
  path?: string;
  exists?: boolean;
  valid?: boolean;
}

export interface ConfigSchemaResponse {
  schema: Record<string, unknown>;
  uiHints?: Record<string, unknown>;
  version?: string;
  generatedAt?: string;
}

export function ensureObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
