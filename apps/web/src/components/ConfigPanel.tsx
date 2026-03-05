import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";

function safeModelList(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const models = (data as { models?: Array<{ id?: string }> }).models;
  if (!Array.isArray(models)) {
    return [];
  }

  return models
    .map((item) => item.id)
    .filter((item): item is string => typeof item === "string");
}

function parseRestartDelayMs(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("restartDelayMs 必须是非负数字");
  }

  return Math.floor(parsed);
}

export function ConfigPanel() {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: api.getConfig,
  });

  const schemaQuery = useQuery({
    queryKey: ["config-schema"],
    queryFn: api.getConfigSchema,
  });

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: api.getAgents,
  });

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: api.getModels,
  });

  const [rawEditor, setRawEditor] = useState("");
  const [sessionKey, setSessionKey] = useState("");
  const [note, setNote] = useState("");
  const [restartDelayMs, setRestartDelayMs] = useState("");
  const [editorError, setEditorError] = useState("");

  useEffect(() => {
    setRawEditor(configQuery.data?.raw ?? "");
  }, [configQuery.data?.raw]);

  const setMutation = useMutation({
    mutationFn: api.configSet,
    onSuccess: async () => {
      setEditorError("");
      await queryClient.invalidateQueries({ queryKey: ["config"] });
      await queryClient.invalidateQueries({ queryKey: ["bindings"] });
    },
  });

  const patchMutation = useMutation({
    mutationFn: api.configPatch,
    onSuccess: async () => {
      setEditorError("");
      await queryClient.invalidateQueries({ queryKey: ["config"] });
      await queryClient.invalidateQueries({ queryKey: ["bindings"] });
    },
  });

  const applyMutation = useMutation({
    mutationFn: api.configApply,
    onSuccess: async () => {
      setEditorError("");
      await queryClient.invalidateQueries({ queryKey: ["config"] });
      await queryClient.invalidateQueries({ queryKey: ["bindings"] });
    },
  });

  const buildPayload = (): {
    raw: string;
    baseHash: string;
    sessionKey?: string;
    note?: string;
    restartDelayMs?: number;
  } => {
    const baseHash = configQuery.data?.hash;
    if (!baseHash) {
      throw new Error("当前配置 hash 缺失，请先刷新配置");
    }

    return {
      raw: rawEditor,
      baseHash,
      ...(sessionKey.trim() ? { sessionKey: sessionKey.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(restartDelayMs.trim()
        ? { restartDelayMs: parseRestartDelayMs(restartDelayMs) }
        : {}),
    };
  };

  const onSet = (): void => {
    try {
      const payload = buildPayload();
      setMutation.mutate({ raw: payload.raw, baseHash: payload.baseHash });
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : String(error));
    }
  };

  const onPatch = (): void => {
    try {
      patchMutation.mutate(buildPayload());
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : String(error));
    }
  };

  const onApply = (): void => {
    try {
      applyMutation.mutate(buildPayload());
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : String(error));
    }
  };

  const onFormatConfig = (): void => {
    try {
      const parsed = JSON.parse(rawEditor) as unknown;
      setRawEditor(JSON.stringify(parsed, null, 2));
      setEditorError("");
    } catch (error) {
      setEditorError(error instanceof Error ? `JSON 解析失败: ${error.message}` : String(error));
    }
  };

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [agentModel, setAgentModel] = useState("");
  const [soulFileName, setSoulFileName] = useState("SOUL.md");
  const [soulContent, setSoulContent] = useState("");

  useEffect(() => {
    if (!selectedAgentId && agentsQuery.data?.agents.length) {
      setSelectedAgentId(agentsQuery.data.agents[0].id);
    }
  }, [selectedAgentId, agentsQuery.data?.agents]);

  const filesQuery = useQuery({
    queryKey: ["agent-files", selectedAgentId],
    queryFn: () => api.getAgentFiles(selectedAgentId),
    enabled: Boolean(selectedAgentId),
  });

  useEffect(() => {
    const files = filesQuery.data?.files ?? [];
    const preferred = files.find((file) => file.name.toLowerCase() === "soul.md");
    if (preferred) {
      setSoulFileName(preferred.name);
    } else if (files.length) {
      setSoulFileName(files[0].name);
    }
  }, [filesQuery.data?.files]);

  const soulQuery = useQuery({
    queryKey: ["agent-file", selectedAgentId, soulFileName],
    queryFn: () => api.getAgentFile(selectedAgentId, soulFileName),
    enabled: Boolean(selectedAgentId && soulFileName),
  });

  useEffect(() => {
    setSoulContent(soulQuery.data?.file.content ?? "");
  }, [soulQuery.data?.file.content]);

  const quickSaveMutation = useMutation({
    mutationFn: async (payload: {
      agentId: string;
      model?: string;
      fileName: string;
      soulContent: string;
    }) => {
      const jobs: Array<Promise<unknown>> = [];
      if (payload.model) {
        jobs.push(
          api.updateAgent(payload.agentId, {
            model: payload.model,
          }),
        );
      }
      jobs.push(api.setAgentFile(payload.agentId, payload.fileName, payload.soulContent));
      await Promise.all(jobs);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
      await queryClient.invalidateQueries({
        queryKey: ["agent-file", selectedAgentId, soulFileName],
      });
    },
  });

  const onSaveQuickConfig = (): void => {
    if (!selectedAgentId || !soulFileName) {
      return;
    }

    quickSaveMutation.mutate({
      agentId: selectedAgentId,
      fileName: soulFileName,
      soulContent,
      ...(agentModel.trim() ? { model: agentModel.trim() } : {}),
    });
  };

  const modelOptions = safeModelList(modelsQuery.data);
  const schemaString = useMemo(
    () => JSON.stringify(schemaQuery.data?.schema ?? {}, null, 2),
    [schemaQuery.data?.schema],
  );

  return (
    <div className="panel-grid">
      <section className="card">
        <div className="card-title">
          <h2>Config 原始编辑</h2>
          <p className="card-desc">支持 set/patch/apply 三种写入方式</p>
        </div>
        <div className="meta-row">
          <span>hash: {configQuery.data?.hash ?? "-"}</span>
          <span>path: {configQuery.data?.path ?? "-"}</span>
        </div>
        {editorError ? <p className="error-text">{editorError}</p> : null}
        <textarea
          value={rawEditor}
          onChange={(event) => setRawEditor(event.target.value)}
          rows={16}
        />
        <div className="form-grid inline">
          <label>
            sessionKey
            <input
              value={sessionKey}
              onChange={(event) => setSessionKey(event.target.value)}
              placeholder="可选"
            />
          </label>
          <label>
            note
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" />
          </label>
          <label>
            restartDelayMs
            <input
              value={restartDelayMs}
              onChange={(event) => setRestartDelayMs(event.target.value)}
              placeholder="可选，单位毫秒"
            />
          </label>
        </div>
        <div className="button-row">
          <button type="button" onClick={onSet} disabled={setMutation.isPending}>
            config.set
          </button>
          <button type="button" onClick={onPatch} disabled={patchMutation.isPending}>
            config.patch
          </button>
          <button type="button" onClick={onApply} disabled={applyMutation.isPending}>
            config.apply
          </button>
          <button type="button" className="secondary" onClick={onFormatConfig}>
            格式化 JSON
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => configQuery.refetch()}
            disabled={configQuery.isFetching}
          >
            刷新配置
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <h2>Schema 预览</h2>
          <p className="card-desc">用于确认可编辑字段与约束定义</p>
        </div>
        <div className="meta-row">
          <span>version: {schemaQuery.data?.version ?? "-"}</span>
          <span>generatedAt: {schemaQuery.data?.generatedAt ?? "-"}</span>
        </div>
        <pre className="pre-block">{schemaString}</pre>
      </section>

      <section className="card full-span">
        <div className="card-title">
          <h2>Agent 快捷配置（Model + SOUL）</h2>
          <p className="card-desc">一键同步模型与人格文件内容</p>
        </div>
        <div className="form-grid inline">
          <label>
            Agent
            <select
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
            >
              {(agentsQuery.data?.agents ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name || agent.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model（可选）
            <input
              list="quick-model-options"
              value={agentModel}
              onChange={(event) => setAgentModel(event.target.value)}
              placeholder="留空表示不改 model"
            />
            <datalist id="quick-model-options">
              {modelOptions.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>
          <label>
            文件
            <select
              value={soulFileName}
              onChange={(event) => setSoulFileName(event.target.value)}
            >
              {(filesQuery.data?.files ?? []).map((file) => (
                <option key={file.name} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea
          value={soulContent}
          onChange={(event) => setSoulContent(event.target.value)}
          rows={14}
        />
        <div className="button-row">
          <button
            type="button"
            onClick={onSaveQuickConfig}
            disabled={quickSaveMutation.isPending || !selectedAgentId}
          >
            保存 Agent 配置
          </button>
        </div>
      </section>
    </div>
  );
}
