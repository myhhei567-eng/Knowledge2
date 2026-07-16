import type {
  AiRequest,
  KnowledgeBridge,
  Note,
  WorkspaceSettings,
  WorkspaceSnapshot,
} from '../types';

const STORAGE_KEY = 'knowledge.desktop.workspace.v1';

const emptyWorkspace = (): WorkspaceSnapshot => ({
  settings: {
    vaultName: '我的知识库',
    vaultPath: '浏览器预览（桌面版将保存为本地 Markdown）',
    enabledScenarios: [],
    ai: {
      enabled: false,
      providerName: '',
      endpoint: '',
      model: '',
      hasKey: false,
    },
  },
  notes: [],
});

function readLocal(): WorkspaceSnapshot {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyWorkspace();
  try {
    return JSON.parse(raw) as WorkspaceSnapshot;
  } catch {
    return emptyWorkspace();
  }
}

function writeLocal(snapshot: WorkspaceSnapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

const browserBridge: KnowledgeBridge = {
  async loadWorkspace() {
    return readLocal();
  },
  async chooseVault() {
    return readLocal();
  },
  async saveSettings(settings) {
    const snapshot = readLocal();
    snapshot.settings = settings;
    writeLocal(snapshot);
    return settings;
  },
  async saveNote(note) {
    const snapshot = readLocal();
    const index = snapshot.notes.findIndex((item) => item.id === note.id);
    if (index >= 0) snapshot.notes[index] = note;
    else snapshot.notes.unshift(note);
    writeLocal(snapshot);
    return { note };
  },
  async deleteNote(noteId) {
    const snapshot = readLocal();
    snapshot.notes = snapshot.notes.filter((note) => note.id !== noteId);
    writeLocal(snapshot);
  },
  async attachFile() {
    return null;
  },
  async configureAi(config) {
    const snapshot = readLocal();
    snapshot.settings.ai = {
      enabled: Boolean(config.endpoint && config.model),
      providerName: config.providerName,
      endpoint: config.endpoint,
      model: config.model,
      hasKey: Boolean(config.apiKey),
    };
    writeLocal(snapshot);
    return snapshot.settings.ai;
  },
  async runAi(_request: AiRequest) {
    throw new Error('浏览器预览不直接发送 AI 请求，请在 Electron 桌面版中使用。');
  },
};

export function getBridge(): KnowledgeBridge {
  return window.knowledge ?? browserBridge;
}

export async function saveNotesSequentially(
  notes: Note[],
  settings?: WorkspaceSettings,
): Promise<WorkspaceSnapshot> {
  const api = getBridge();
  if (settings) await api.saveSettings(settings);
  for (const note of notes) await api.saveNote(note);
  return api.loadWorkspace();
}
