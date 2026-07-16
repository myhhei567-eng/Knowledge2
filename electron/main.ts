import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  safeStorage,
} from 'electron';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  properties: Record<string, string>;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  sourcePath?: string;
}

interface Settings {
  vaultName: string;
  vaultPath: string;
  enabledScenarios: string[];
  ai?: {
    enabled: boolean;
    providerName: string;
    endpoint: string;
    model: string;
    hasKey: boolean;
  };
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');
let vaultPath = '';

function defaultVault() {
  return app.isPackaged
    ? path.join(app.getPath('documents'), 'Knowledge')
    : path.join(projectRoot, 'workspace');
}

function ensureInside(root: string, candidate: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (resolvedCandidate !== resolvedRoot && !resolvedCandidate.startsWith(resolvedRoot + path.sep)) {
    throw new Error('路径超出当前知识库范围');
  }
  return resolvedCandidate;
}

function safeSegment(value: string, fallback: string) {
  const sanitized = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();
  return sanitized || fallback;
}

async function ensureVault() {
  if (!vaultPath) vaultPath = defaultVault();
  await fs.mkdir(path.join(vaultPath, 'notes'), { recursive: true });
  await fs.mkdir(path.join(vaultPath, 'attachments'), { recursive: true });
  await fs.mkdir(path.join(vaultPath, '.knowledge', 'trash'), { recursive: true });
}

function settingsPath() {
  return path.join(vaultPath, '.knowledge', 'settings.json');
}

function secretPath() {
  return path.join(vaultPath, '.knowledge', 'ai-key.bin');
}

async function loadSettings(): Promise<Settings> {
  await ensureVault();
  try {
    const parsed = JSON.parse(await fs.readFile(settingsPath(), 'utf8')) as Settings;
    return {
      ...parsed,
      vaultPath,
      vaultName: parsed.vaultName || path.basename(vaultPath),
      enabledScenarios: Array.isArray(parsed.enabledScenarios) ? parsed.enabledScenarios : [],
    };
  } catch {
    return {
      vaultName: path.basename(vaultPath) || '我的知识库',
      vaultPath,
      enabledScenarios: [],
      ai: {
        enabled: false,
        providerName: '',
        endpoint: '',
        model: '',
        hasKey: false,
      },
    };
  }
}

async function saveSettings(settings: Settings) {
  await ensureVault();
  const next = {
    ...settings,
    vaultPath,
    vaultName: settings.vaultName || path.basename(vaultPath),
  };
  await fs.writeFile(settingsPath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

async function walkMarkdown(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await walkMarkdown(absolute)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) result.push(absolute);
  }
  return result;
}

function stableId(relativePath: string) {
  return createHash('sha1').update(relativePath).digest('hex').slice(0, 16);
}

async function readNotes(): Promise<Note[]> {
  await ensureVault();
  const notesRoot = path.join(vaultPath, 'notes');
  const files = await walkMarkdown(notesRoot);
  const notes = await Promise.all(
    files.map(async (file) => {
      const sourcePath = path.relative(vaultPath, file);
      const parsed = matter(await fs.readFile(file, 'utf8'));
      const stat = await fs.stat(file);
      const folderPath = path.relative(notesRoot, path.dirname(file));
      const tags = Array.isArray(parsed.data.tags)
        ? parsed.data.tags.map(String)
        : typeof parsed.data.tags === 'string'
          ? parsed.data.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
          : [];
      const rawProperties =
        parsed.data.properties && typeof parsed.data.properties === 'object'
          ? parsed.data.properties
          : {};
      return {
        id: String(parsed.data.id || stableId(sourcePath)),
        title: String(parsed.data.title || path.basename(file, '.md')),
        content: parsed.content.replace(/^\n/, ''),
        folder: folderPath === '' ? '' : folderPath.split(path.sep).join('/'),
        tags,
        properties: Object.fromEntries(
          Object.entries(rawProperties).map(([key, value]) => [key, String(value)]),
        ),
        favorite: Boolean(parsed.data.favorite),
        createdAt: String(parsed.data.createdAt || stat.birthtime.toISOString()),
        updatedAt: String(parsed.data.updatedAt || stat.mtime.toISOString()),
        sourcePath,
      } satisfies Note;
    }),
  );
  return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function loadWorkspace() {
  return {
    settings: await loadSettings(),
    notes: await readNotes(),
  };
}

function validateNote(value: unknown): asserts value is Note {
  if (!value || typeof value !== 'object') throw new Error('无效笔记');
  const note = value as Partial<Note>;
  if (!note.id || typeof note.id !== 'string') throw new Error('笔记缺少 ID');
  if (!note.title || typeof note.title !== 'string') throw new Error('笔记标题不能为空');
  if (typeof note.content !== 'string') throw new Error('笔记正文无效');
}

async function saveNote(note: Note) {
  validateNote(note);
  await ensureVault();
  const folderSegments = (note.folder || '')
    .split('/')
    .map((segment) => safeSegment(segment, '未分类'))
    .filter(Boolean);
  const fileName = safeSegment(note.title, '未命名') + '.md';
  const target = ensureInside(
    vaultPath,
    path.join(vaultPath, 'notes', ...folderSegments, fileName),
  );
  await fs.mkdir(path.dirname(target), { recursive: true });

  const now = new Date().toISOString();
  const next: Note = {
    ...note,
    title: note.title.trim(),
    updatedAt: now,
    createdAt: note.createdAt || now,
    sourcePath: path.relative(vaultPath, target),
  };
  const markdown = matter.stringify(next.content, {
    id: next.id,
    title: next.title,
    tags: next.tags,
    properties: next.properties,
    favorite: next.favorite,
    createdAt: next.createdAt,
    updatedAt: next.updatedAt,
  });
  const temp = target + '.tmp-' + process.pid;
  await fs.writeFile(temp, markdown, 'utf8');
  await fs.rename(temp, target);

  if (note.sourcePath) {
    const previous = ensureInside(vaultPath, path.join(vaultPath, note.sourcePath));
    if (previous !== target) await fs.rm(previous, { force: true });
  }
  return { note: next, previousPath: note.sourcePath };
}

async function deleteNote(noteId: string) {
  const note = (await readNotes()).find((item) => item.id === noteId);
  if (!note?.sourcePath) return;
  const source = ensureInside(vaultPath, path.join(vaultPath, note.sourcePath));
  const target = ensureInside(
    vaultPath,
    path.join(
      vaultPath,
      '.knowledge',
      'trash',
      Date.now() + '-' + path.basename(note.sourcePath),
    ),
  );
  await fs.rename(source, target);
}

function aiEndpoint(base: string) {
  const cleaned = base.replace(/\/$/, '');
  return cleaned.endsWith('/chat/completions') ? cleaned : cleaned + '/chat/completions';
}

async function readAiKey() {
  const encrypted = await fs.readFile(secretPath());
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前系统无法使用安全密钥存储');
  }
  return safeStorage.decryptString(encrypted);
}

async function createWindow() {
  const preload = path.join(projectRoot, 'electron', 'preload.cjs');
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1060,
    minHeight: 720,
    backgroundColor: '#f6f7f9',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (!app.isPackaged) await window.loadURL('http://127.0.0.1:5173');
  else await window.loadFile(path.join(projectRoot, 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  vaultPath = defaultVault();
  await ensureVault();

  ipcMain.handle('workspace:load', () => loadWorkspace());
  ipcMain.handle('workspace:choose', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return null;
    vaultPath = path.resolve(result.filePaths[0]);
    await ensureVault();
    return loadWorkspace();
  });
  ipcMain.handle('workspace:save-settings', async (_event, settings: Settings) => {
    if (!settings || typeof settings !== 'object') throw new Error('无效设置');
    return saveSettings(settings);
  });
  ipcMain.handle('notes:save', (_event, note: Note) => saveNote(note));
  ipcMain.handle('notes:delete', (_event, noteId: string) => deleteNote(String(noteId)));
  ipcMain.handle('attachments:pick', async (_event, noteId: string) => {
    if (!noteId) throw new Error('缺少笔记 ID');
    const result = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (result.canceled || !result.filePaths[0]) return null;
    const source = result.filePaths[0];
    const name = safeSegment(path.basename(source), '附件');
    const target = ensureInside(vaultPath, path.join(vaultPath, 'attachments', name));
    await fs.copyFile(source, target);
    return { name, relativePath: path.relative(vaultPath, target).split(path.sep).join('/') };
  });
  ipcMain.handle('ai:configure', async (_event, config) => {
    if (!config || typeof config !== 'object') throw new Error('无效 AI 配置');
    const endpoint = String(config.endpoint || '').trim();
    const model = String(config.model || '').trim();
    if (endpoint) new URL(endpoint);
    if (config.apiKey) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('系统安全存储不可用');
      await fs.writeFile(secretPath(), safeStorage.encryptString(String(config.apiKey)));
    }
    const settings = await loadSettings();
    settings.ai = {
      enabled: Boolean(endpoint && model),
      providerName: String(config.providerName || 'OpenAI-compatible'),
      endpoint,
      model,
      hasKey: Boolean(config.apiKey || settings.ai?.hasKey),
    };
    await saveSettings(settings);
    return settings.ai;
  });
  ipcMain.handle('ai:run', async (_event, request) => {
    const settings = await loadSettings();
    const ai = settings.ai;
    if (!ai?.enabled || !ai.endpoint || !ai.model) throw new Error('请先配置 AI Provider');
    const key = await readAiKey();
    const context = Array.isArray(request?.context) ? request.context.slice(0, 8) : [];
    const contextText = context
      .map((item: { title?: string; content?: string }) =>
        '# ' + String(item.title || '未命名') + '\n' + String(item.content || '').slice(0, 12000),
      )
      .join('\n\n---\n\n');
    const response = await fetch(aiEndpoint(ai.endpoint), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + key,
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          {
            role: 'system',
            content:
              '你是本地知识管理助手。只依据用户明确提供的上下文回答；不确定时说明。任何修改都以建议文本返回，不直接写文件。',
          },
          {
            role: 'user',
            content:
              '任务：' + String(request?.instruction || '') + '\n\n允许使用的本地上下文：\n' + contextText,
          },
        ],
      }),
    });
    if (!response.ok) throw new Error('AI 请求失败：' + response.status);
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: payload.choices?.[0]?.message?.content || '',
      provider: ai.providerName,
      model: ai.model,
      usage: {
        inputTokens: payload.usage?.prompt_tokens,
        outputTokens: payload.usage?.completion_tokens,
      },
    };
  });

  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
