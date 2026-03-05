import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";

type AgentsSubTab = "overview" | "lifecycle" | "files";

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

export function AgentsPanel({ subTab }: { subTab: AgentsSubTab }) {
  const queryClient = useQueryClient();

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: api.getAgents,
  });

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: api.getModels,
  });

  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string>("SOUL.md");

  const [createName, setCreateName] = useState("");
  const [createWorkspace, setCreateWorkspace] = useState("");
  const [createEmoji, setCreateEmoji] = useState("");
  const [createAvatar, setCreateAvatar] = useState("");

  const [editName, setEditName] = useState("");
  const [editWorkspace, setEditWorkspace] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [deleteFiles, setDeleteFiles] = useState(false);

  const [fileContent, setFileContent] = useState("");

  const selectedAgent = useMemo(
    () => agentsQuery.data?.agents.find((item) => item.id === selectedAgentId),
    [agentsQuery.data?.agents, selectedAgentId],
  );

  useEffect(() => {
    if (!selectedAgentId && agentsQuery.data?.agents.length) {
      setSelectedAgentId(agentsQuery.data.agents[0].id);
    }
  }, [agentsQuery.data?.agents, selectedAgentId]);

  useEffect(() => {
    if (!selectedAgent) {
      return;
    }

    setEditName(selectedAgent.name ?? "");
    setEditWorkspace("");
    setEditModel("");
    setEditAvatar("");
  }, [selectedAgent]);

  const filesQuery = useQuery({
    queryKey: ["agent-files", selectedAgentId],
    queryFn: () => api.getAgentFiles(selectedAgentId),
    enabled: Boolean(selectedAgentId),
  });

  useEffect(() => {
    if (!filesQuery.data?.files.length) {
      return;
    }

    if (!filesQuery.data.files.some((file) => file.name === selectedFileName)) {
      setSelectedFileName(filesQuery.data.files[0].name);
    }
  }, [filesQuery.data?.files, selectedFileName]);

  const fileQuery = useQuery({
    queryKey: ["agent-file", selectedAgentId, selectedFileName],
    queryFn: () => api.getAgentFile(selectedAgentId, selectedFileName),
    enabled: Boolean(selectedAgentId && selectedFileName),
  });

  useEffect(() => {
    setFileContent(fileQuery.data?.file.content ?? "");
  }, [fileQuery.data?.file.content]);

  const createMutation = useMutation({
    mutationFn: api.createAgent,
    onSuccess: async () => {
      setCreateName("");
      setCreateWorkspace("");
      setCreateEmoji("");
      setCreateAvatar("");
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      name?: string;
      workspace?: string;
      model?: string;
      avatar?: string;
    }) => api.updateAgent(payload.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string; deleteFiles: boolean }) =>
      api.deleteAgent(payload.id, payload.deleteFiles),
    onSuccess: async () => {
      setSelectedAgentId("");
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const saveFileMutation = useMutation({
    mutationFn: (payload: { id: string; name: string; content: string }) =>
      api.setAgentFile(payload.id, payload.name, payload.content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["agent-file", selectedAgentId, selectedFileName],
      });
    },
  });

  const onCreate = (): void => {
    if (!createName.trim() || !createWorkspace.trim()) {
      return;
    }

    createMutation.mutate({
      name: createName.trim(),
      workspace: createWorkspace.trim(),
      ...(createEmoji.trim() ? { emoji: createEmoji.trim() } : {}),
      ...(createAvatar.trim() ? { avatar: createAvatar.trim() } : {}),
    });
  };

  const onUpdate = (): void => {
    if (!selectedAgentId) {
      return;
    }

    updateMutation.mutate({
      id: selectedAgentId,
      ...(editName.trim() ? { name: editName.trim() } : {}),
      ...(editWorkspace.trim() ? { workspace: editWorkspace.trim() } : {}),
      ...(editModel.trim() ? { model: editModel.trim() } : {}),
      ...(editAvatar.trim() ? { avatar: editAvatar.trim() } : {}),
    });
  };

  const onDelete = (): void => {
    if (!selectedAgentId) {
      return;
    }

    if (!window.confirm(`确认删除 Agent ${selectedAgentId}？`)) {
      return;
    }

    deleteMutation.mutate({ id: selectedAgentId, deleteFiles });
  };

  const onSaveFile = (): void => {
    if (!selectedAgentId || !selectedFileName) {
      return;
    }

    saveFileMutation.mutate({
      id: selectedAgentId,
      name: selectedFileName,
      content: fileContent,
    });
  };

  const modelOptions = safeModelList(modelsQuery.data);
  const totalAgents = agentsQuery.data?.agents.length ?? 0;
  const totalFiles = filesQuery.data?.files.length ?? 0;
  const showOverview = subTab === "overview";
  const showLifecycle = subTab === "lifecycle";
  const showFiles = subTab === "files";

  return (
    <div className="panel-grid">
      <section className="card">
        <div className="card-title">
          <h2>Agent 列表</h2>
          <p className="card-desc">选择目标 Agent 进行配置与文件编辑</p>
        </div>
        <div className="meta-row">
          <span>总数: {totalAgents}</span>
          <span>当前: {selectedAgentId || "-"}</span>
        </div>
        {agentsQuery.isLoading ? <p>加载中...</p> : null}
        <div className="list-box">
          {(agentsQuery.data?.agents ?? []).map((agent) => (
            <button
              type="button"
              key={agent.id}
              className={agent.id === selectedAgentId ? "list-item active" : "list-item"}
              onClick={() => setSelectedAgentId(agent.id)}
            >
              <span>{agent.name || agent.id}</span>
              <small>{agent.id}</small>
            </button>
          ))}
        </div>
      </section>

      {showOverview ? (
        <section className="card">
          <div className="card-title">
            <h2>当前 Agent 快照</h2>
            <p className="card-desc">查看当前选中 Agent 的基础配置与运行入口</p>
          </div>
          {!selectedAgent ? <p>请先选择 Agent</p> : null}
          {selectedAgent ? (
            <div className="meta-grid">
              <span>名称: {selectedAgent.name || "-"}</span>
              <span>ID: {selectedAgent.id}</span>
              <span>默认 Agent: {agentsQuery.data?.defaultId === selectedAgent.id ? "是" : "否"}</span>
              <span>文件数量: {totalFiles}</span>
              <span>当前文件: {selectedFileName || "-"}</span>
              <span>模型候选数: {modelOptions.length}</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {showLifecycle ? (
        <section className="card">
          <div className="card-title">
            <h2>创建 Agent</h2>
            <p className="card-desc">最少需要名称与 workspace</p>
          </div>
          <div className="form-grid">
            <label>
              名称
              <input value={createName} onChange={(event) => setCreateName(event.target.value)} />
            </label>
            <label>
              Workspace
              <input
                value={createWorkspace}
                onChange={(event) => setCreateWorkspace(event.target.value)}
              />
            </label>
            <label>
              Emoji
              <input value={createEmoji} onChange={(event) => setCreateEmoji(event.target.value)} />
            </label>
            <label>
              Avatar
              <input
                value={createAvatar}
                onChange={(event) => setCreateAvatar(event.target.value)}
              />
            </label>
            <button type="button" onClick={onCreate} disabled={createMutation.isPending}>
              创建
            </button>
          </div>
        </section>
      ) : null}

      {showLifecycle ? (
        <section className="card">
          <div className="card-title">
            <h2>编辑 Agent</h2>
            <p className="card-desc">留空字段表示不修改该项</p>
          </div>
          {!selectedAgentId ? <p>请先选择 Agent</p> : null}
          {selectedAgentId ? (
            <div className="form-grid">
              <label>
                名称
                <input value={editName} onChange={(event) => setEditName(event.target.value)} />
              </label>
              <label>
                Workspace（留空表示不修改）
                <input
                  value={editWorkspace}
                  onChange={(event) => setEditWorkspace(event.target.value)}
                />
              </label>
              <label>
                模型（留空表示不修改）
                <input
                  list="model-options"
                  value={editModel}
                  onChange={(event) => setEditModel(event.target.value)}
                />
                <datalist id="model-options">
                  {modelOptions.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </label>
              <label>
                Avatar
                <input value={editAvatar} onChange={(event) => setEditAvatar(event.target.value)} />
              </label>
              <button type="button" onClick={onUpdate} disabled={updateMutation.isPending}>
                保存修改
              </button>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={deleteFiles}
                  onChange={(event) => setDeleteFiles(event.target.checked)}
                />
                删除时同时删除文件（默认关闭）
              </label>
              <button type="button" className="danger" onClick={onDelete}>
                删除 Agent
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {showFiles ? (
        <section className="card full-span">
          <div className="card-title">
            <h2>Agent 文件编辑</h2>
            <p className="card-desc">可直接维护 `SOUL.md` 与其他运行文件</p>
          </div>
          <div className="meta-row">
            <span>文件数: {totalFiles}</span>
            <span>当前文件: {selectedFileName || "-"}</span>
          </div>
          {!selectedAgentId ? <p>请先选择 Agent</p> : null}
          {selectedAgentId ? (
            <div className="file-editor">
              <aside className="file-list">
                {(filesQuery.data?.files ?? []).map((file) => (
                  <button
                    key={file.name}
                    type="button"
                    className={selectedFileName === file.name ? "list-item active" : "list-item"}
                    onClick={() => setSelectedFileName(file.name)}
                  >
                    {file.name}
                  </button>
                ))}
              </aside>
              <div className="editor-body">
                <div className="editor-header">
                  <strong>{selectedFileName}</strong>
                  <button
                    type="button"
                    onClick={onSaveFile}
                    disabled={saveFileMutation.isPending || fileQuery.isLoading}
                  >
                    保存文件
                  </button>
                </div>
                <textarea
                  value={fileContent}
                  onChange={(event) => setFileContent(event.target.value)}
                  rows={18}
                />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
