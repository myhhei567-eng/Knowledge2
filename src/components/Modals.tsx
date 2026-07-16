import { useState } from 'react';
import {
  Bot,
  Check,
  ChevronRight,
  Database,
  FolderOpen,
  KeyRound,
  Loader2,
  LockKeyhole,
  Send,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import { getBridge } from '../lib/bridge';
import { SCENARIOS } from '../lib/scenarios';
import type { Note, ScenarioId, WorkspaceSettings } from '../types';

interface SettingsProps {
  settings: WorkspaceSettings;
  onClose: () => void;
  onSave: (selected: ScenarioId[], vaultName: string) => Promise<void>;
  onChooseVault: () => Promise<void>;
}

export function SettingsModal({
  settings,
  onClose,
  onSave,
  onChooseVault,
}: SettingsProps) {
  const [selected, setSelected] = useState<ScenarioId[]>(settings.enabledScenarios);
  const [vaultName, setVaultName] = useState(settings.vaultName);
  const [busy, setBusy] = useState(false);

  const toggle = (id: ScenarioId) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const save = async () => {
    if (!selected.length) return;
    setBusy(true);
    try {
      await onSave(selected, vaultName.trim() || '我的知识库');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal settings-modal">
        <header><div><span className="modal-icon"><Settings2 size={18} /></span><div><h2>知识库设置</h2><p>管理本地目录和场景模式</p></div></div><button onClick={onClose}><X size={19} /></button></header>
        <div className="modal-body">
          <label className="field-label">知识库名称<input value={vaultName} onChange={(event) => setVaultName(event.target.value)} /></label>
          <div className="vault-card">
            <span><Database size={19} /></span>
            <div><strong>{settings.vaultPath}</strong><small>Markdown、附件与可重建索引</small></div>
            <button onClick={onChooseVault}><FolderOpen size={15} /> 更换目录</button>
          </div>

          <div className="settings-section-title"><div><strong>场景模式</strong><small>可同时启用多个；不会改变底层数据格式</small></div><span>{selected.length} 已启用</span></div>
          <div className="settings-scenarios">
            {SCENARIOS.map((scenario) => {
              const active = selected.includes(scenario.id);
              return (
                <button className={active ? 'active' : ''} key={scenario.id} onClick={() => toggle(scenario.id)}>
                  <span style={{ background: scenario.color }} />
                  <div><strong>{scenario.name}</strong><small>{scenario.description}</small></div>
                  <em>{active && <Check size={14} />}</em>
                </button>
              );
            })}
          </div>
        </div>
        <footer><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={!selected.length || busy} onClick={save}>{busy && <Loader2 className="spin" size={16} />}保存设置</button></footer>
      </section>
    </div>
  );
}

interface AiProps {
  settings: WorkspaceSettings;
  note?: Note;
  onClose: () => void;
  onSettingsChanged: (ai: WorkspaceSettings['ai']) => void;
}

export function AiPanel({ settings, note, onClose, onSettingsChanged }: AiProps) {
  const current = settings.ai;
  const [providerName, setProviderName] = useState(current?.providerName || 'OpenAI-compatible');
  const [endpoint, setEndpoint] = useState(current?.endpoint || 'https://api.openai.com/v1');
  const [model, setModel] = useState(current?.model || '');
  const [apiKey, setApiKey] = useState('');
  const [instruction, setInstruction] = useState('总结当前笔记，并列出下一步可执行事项。');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'config' | 'run' | ''>('');

  const configure = async () => {
    setError('');
    setBusy('config');
    try {
      const ai = await getBridge().configureAi({ providerName, endpoint, model, apiKey: apiKey || undefined });
      onSettingsChanged(ai);
      setApiKey('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '配置失败');
    } finally {
      setBusy('');
    }
  };

  const run = async () => {
    if (!note) return;
    setError('');
    setResult('');
    setBusy('run');
    try {
      const response = await getBridge().runAi({
        instruction,
        context: [{ noteId: note.id, title: note.title, content: note.content }],
      });
      setResult(response.text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI 请求失败');
    } finally {
      setBusy('');
    }
  };

  const configured = Boolean(current?.enabled && current.hasKey);

  return (
    <div className="ai-drawer-backdrop" onMouseDown={onClose}>
      <aside className="ai-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="ai-orb"><Sparkles size={18} /></span><div><h2>AI 助手</h2><p>{configured ? current?.providerName + ' · ' + current?.model : '可选增强，不影响核心功能'}</p></div></div><button onClick={onClose}><X size={19} /></button></header>

        {!configured ? (
          <div className="ai-config">
            <div className="security-note"><LockKeyhole size={17} /><p><strong>密钥只保存在系统安全存储中</strong><span>Renderer、Markdown 和日志都无法读取明文。</span></p></div>
            <label>Provider 名称<input value={providerName} onChange={(event) => setProviderName(event.target.value)} /></label>
            <label>OpenAI-compatible Endpoint<input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://.../v1" /></label>
            <label>模型<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如 gpt-4.1-mini" /></label>
            <label>API Key<div className="secret-input"><KeyRound size={15} /><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="仅本次写入安全存储" /></div></label>
            <button className="primary-button full-width" disabled={!endpoint || !model || !apiKey || busy === 'config'} onClick={configure}>{busy === 'config' ? <Loader2 className="spin" size={16} /> : <ChevronRight size={16} />}保存并启用</button>
          </div>
        ) : (
          <div className="ai-workspace">
            <section className="context-preview">
              <header><span>即将发送的上下文</span><em>1 篇笔记</em></header>
              {note ? <div><FileContext note={note} /></div> : <p>请先打开一篇笔记。</p>}
              <small>只发送上面列出的内容，不会自动读取整个知识库。</small>
            </section>
            <label className="ai-instruction">你想让 AI 做什么？<textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} /></label>
            <button className="primary-button full-width" disabled={!note || busy === 'run'} onClick={run}>{busy === 'run' ? <Loader2 className="spin" size={16} /> : <Send size={16} />}生成建议</button>
            {result && <section className="ai-result"><header><Bot size={16} /> AI 建议</header><p>{result}</p><small>结果不会自动写回笔记。复制或人工确认后再应用。</small></section>}
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
      </aside>
    </div>
  );
}

function FileContext({ note }: { note: Note }) {
  return <div className="file-context"><span>{note.title.slice(0, 1).toUpperCase()}</span><div><strong>{note.title}</strong><small>{note.content.length} 字符 · 当前笔记</small></div><Check size={15} /></div>;
}
