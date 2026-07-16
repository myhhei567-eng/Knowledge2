import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Command,
  FileText,
  Loader2,
  Plus,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Editor } from './components/Editor';
import { AiPanel, SettingsModal } from './components/Modals';
import { Onboarding } from './components/Onboarding';
import { RightPanel } from './components/RightPanel';
import { Sidebar } from './components/Sidebar';
import {
  CalendarView,
  CanvasView,
  DatabaseView,
  GraphView,
  HomeView,
  TasksView,
  TrashView,
} from './components/Views';
import { getBridge, saveNotesSequentially } from './lib/bridge';
import {
  countWords,
  extractTasks,
  noteExcerpt,
  searchNotes,
  toggleTaskInContent,
  type ParsedTask,
} from './lib/knowledge';
import { createScenarioNotes } from './lib/scenarios';
import type {
  Note,
  ScenarioId,
  ViewId,
  WorkspaceSnapshot,
} from './types';

const api = getBridge();

function emptyNote(folder = '收件箱', index = 1): Note {
  const now = new Date().toISOString();
  const title = '未命名笔记 ' + index;
  return {
    id: crypto.randomUUID(),
    title,
    content: '# ' + title + '\n\n',
    folder,
    tags: [],
    properties: {},
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}

export default function App() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [activeView, setActiveView] = useState<ViewId>('home');
  const [activeNoteId, setActiveNoteId] = useState('');
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [loadError, setLoadError] = useState('');
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    api.loadWorkspace()
      .then((workspace) => {
        setSnapshot(workspace);
        setActiveNoteId(workspace.notes[0]?.id || '');
      })
      .catch((cause) => setLoadError(cause instanceof Error ? cause.message : '知识库加载失败'));
    return () => {
      saveTimers.current.forEach(clearTimeout);
      saveTimers.current.clear();
    };
  }, []);

  const notes = snapshot?.notes ?? [];
  const settings = snapshot?.settings;
  const activeNote = notes.find((note) => note.id === activeNoteId);
  const tasks = useMemo(() => notes.flatMap(extractTasks), [notes]);
  const folders = useMemo(
    () => [...new Set(notes.map((note) => note.folder.split('/')[0]).filter(Boolean))],
    [notes],
  );
  const searchResults = useMemo(
    () => (query.trim() ? searchNotes(notes, query).slice(0, 8) : []),
    [notes, query],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        void createNote();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('.global-search input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const replaceNote = (note: Note) => {
    setSnapshot((current) => current ? {
      ...current,
      notes: current.notes.map((item) => item.id === note.id ? note : item),
    } : current);
  };

  const updateNote = (note: Note) => {
    replaceNote(note);
    const previous = saveTimers.current.get(note.id);
    if (previous) clearTimeout(previous);
    saveTimers.current.set(note.id, setTimeout(async () => {
      try {
        const result = await api.saveNote(note);
        setSnapshot((current) => current ? {
          ...current,
          notes: current.notes.map((item) =>
            item.id === note.id
              ? { ...item, sourcePath: result.note.sourcePath }
              : item,
          ),
        } : current);
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : '笔记保存失败');
      }
    }, 550));
  };

  const createNote = async (folder?: string) => {
    if (!snapshot) return;
    const note = emptyNote(folder || (activeView === 'inbox' ? '收件箱' : ''), notes.length + 1);
    setSnapshot({ ...snapshot, notes: [note, ...snapshot.notes] });
    setActiveNoteId(note.id);
    setActiveView('notes');
    try {
      const result = await api.saveNote(note);
      replaceNote(result.note);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : '新建笔记失败');
    }
  };

  const openNote = (note: Note) => {
    setActiveNoteId(note.id);
    setActiveView('notes');
    setQuery('');
  };

  const openWikiLink = (title: string) => {
    const target = notes.find((note) => note.title.toLocaleLowerCase() === title.toLocaleLowerCase());
    if (target) openNote(target);
    else {
      const note = emptyNote('', notes.length + 1);
      note.title = title;
      note.content = '# ' + title + '\n\n';
      setSnapshot((current) => current ? { ...current, notes: [note, ...current.notes] } : current);
      setActiveNoteId(note.id);
      void api.saveNote(note);
    }
  };

  const deleteActiveNote = async () => {
    if (!activeNote || !snapshot) return;
    if (!window.confirm('将“' + activeNote.title + '”移动到回收站？')) return;
    await api.deleteNote(activeNote.id);
    const remaining = snapshot.notes.filter((note) => note.id !== activeNote.id);
    setSnapshot({ ...snapshot, notes: remaining });
    setActiveNoteId(remaining[0]?.id || '');
  };

  const attachFile = async () => {
    if (!activeNote) return;
    const attachment = await api.attachFile(activeNote.id);
    if (!attachment) {
      if (!window.knowledge) window.alert('浏览器预览无法打开系统文件选择器，请在 Electron 桌面版中测试附件。');
      return;
    }
    const depth = activeNote.folder ? activeNote.folder.split('/').length : 0;
    const relative = '../'.repeat(depth + 1) + attachment.relativePath;
    updateNote({
      ...activeNote,
      content: activeNote.content + '\n\n[' + attachment.name + '](' + relative + ')\n',
    });
  };

  const toggleTask = (task: ParsedTask) => {
    const note = notes.find((item) => item.id === task.noteId);
    if (!note) return;
    updateNote({ ...note, content: toggleTaskInContent(note.content, task.line) });
  };

  const completeOnboarding = async (selected: ScenarioId[]) => {
    if (!snapshot) return;
    const nextSettings = { ...snapshot.settings, enabledScenarios: selected };
    const starters = createScenarioNotes(selected, snapshot.notes.map((note) => note.title));
    const next = await saveNotesSequentially(starters, nextSettings);
    setSnapshot(next);
    setActiveNoteId(next.notes[0]?.id || '');
  };

  const saveScenarioSettings = async (selected: ScenarioId[], vaultName: string) => {
    if (!snapshot) return;
    const newlyEnabled = selected.filter((id) => !snapshot.settings.enabledScenarios.includes(id));
    const starters = createScenarioNotes(newlyEnabled, notes.map((note) => note.title));
    const nextSettings = {
      ...snapshot.settings,
      vaultName,
      enabledScenarios: selected,
    };
    const next = await saveNotesSequentially(starters, nextSettings);
    setSnapshot(next);
  };

  const chooseVault = async () => {
    const next = await api.chooseVault();
    if (next) {
      setSnapshot(next);
      setActiveNoteId(next.notes[0]?.id || '');
    }
  };

  if (loadError && !snapshot) {
    return <div className="fatal-state"><div className="empty-orb"><FileText size={24} /></div><h1>无法打开知识库</h1><p>{loadError}</p><button className="primary-button" onClick={() => location.reload()}>重试</button></div>;
  }

  if (!snapshot || !settings) {
    return <div className="loading-state"><Loader2 className="spin" size={26} /><span>正在打开本地知识库…</span></div>;
  }

  if (!settings.enabledScenarios.length) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  const isNoteView = activeView === 'notes' || activeView === 'inbox' || activeView === 'favorites';
  const collection = activeView === 'inbox'
    ? notes.filter((note) => note.folder === '收件箱')
    : activeView === 'favorites'
      ? notes.filter((note) => note.favorite)
      : notes;

  const common = { notes, onOpenNote: openNote, onCreateNote: () => void createNote() };

  let mainContent;
  if (isNoteView) {
    mainContent = (
      <div className="note-workspace">
        <aside className="note-list-panel">
          <header><div><span>{activeView === 'favorites' ? '收藏' : activeView === 'inbox' ? '收件箱' : '所有笔记'}</span><small>{collection.length}</small></div><button onClick={() => void createNote()}><Plus size={16} /></button></header>
          <div className="note-list">
            {collection.map((note) => (
              <button className={note.id === activeNoteId ? 'active' : ''} key={note.id} onClick={() => setActiveNoteId(note.id)}>
                <div><strong>{note.title}</strong><time>{new Date(note.updatedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</time></div>
                <p>{noteExcerpt(note, 76) || '空白笔记'}</p>
                <span>{note.folder || '未分类'} {note.tags.slice(0, 2).map((tag) => <em key={tag}>#{tag}</em>)}</span>
              </button>
            ))}
            {!collection.length && <div className="empty-state compact"><FileText size={22} /><p>这里还没有笔记。</p></div>}
          </div>
        </aside>
        {activeNote ? <Editor note={activeNote} onChange={updateNote} onDelete={deleteActiveNote} onAttach={attachFile} onOpenLink={openWikiLink} /> : <div className="empty-state full"><div className="empty-orb"><FileText size={22} /></div><h2>选择或创建一篇笔记</h2></div>}
      </div>
    );
  } else if (activeView === 'home') mainContent = <HomeView {...common} settings={settings} />;
  else if (activeView === 'database') mainContent = <DatabaseView {...common} />;
  else if (activeView === 'tasks') mainContent = <TasksView {...common} onToggleTask={toggleTask} />;
  else if (activeView === 'calendar') mainContent = <CalendarView {...common} />;
  else if (activeView === 'canvas') mainContent = <CanvasView {...common} />;
  else if (activeView === 'graph') mainContent = <GraphView {...common} />;
  else mainContent = <TrashView />;

  const showRightPanel = isNoteView;

  return (
    <div className="app-shell">
      <Sidebar
        active={activeView}
        noteCount={notes.length}
        taskCount={tasks.filter((task) => !task.completed).length}
        favoriteCount={notes.filter((note) => note.favorite).length}
        folders={folders}
        onSelect={setActiveView}
        onCreateNote={(folder) => void createNote(folder)}
      />

      <div className="app-main">
        <header className="topbar">
          <div className="global-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索笔记、标签或内容…" />
            <kbd><Command size={12} /> K</kbd>
            {query.trim() && (
              <div className="search-results">
                <header><span>搜索结果</span><small>{searchResults.length}</small></header>
                {searchResults.map((note) => <button key={note.id} onClick={() => openNote(note)}><FileText size={15} /><span><strong>{note.title}</strong><small>{noteExcerpt(note, 70)}</small></span></button>)}
                {!searchResults.length && <p>没有找到匹配内容</p>}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button className="topbar-new" onClick={() => void createNote()}><Plus size={16} /> 新建</button>
            <button onClick={() => setAiOpen(true)}><Sparkles size={16} /> AI 助手</button>
            <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="设置"><Settings size={18} /></button>
          </div>
        </header>

        <div className={'content-shell' + (showRightPanel ? ' with-right' : '')}>
          <main className="main-stage">{mainContent}</main>
          {showRightPanel && <RightPanel note={activeNote} notes={notes} onOpenNote={openNote} onChange={updateNote} />}
        </div>

        <footer className="statusbar">
          <span><i className="status-dot" /> {settings.vaultName}</span>
          <span>{activeNote ? countWords(activeNote.content) : notes.reduce((total, note) => total + countWords(note.content), 0)} 字</span>
          <span><CheckCircle2 size={13} /> 本地已保存</span>
          <span className="status-spacer" />
          <span><Bot size={13} /> {settings.ai?.enabled ? settings.ai.model : 'AI 未配置'}</span>
        </footer>
      </div>

      {settingsOpen && <SettingsModal settings={settings} onClose={() => setSettingsOpen(false)} onSave={saveScenarioSettings} onChooseVault={chooseVault} />}
      {aiOpen && <AiPanel settings={settings} note={activeNote} onClose={() => setAiOpen(false)} onSettingsChanged={(ai) => setSnapshot({ ...snapshot, settings: { ...settings, ai } })} />}
      {loadError && <button className="toast-error" onClick={() => setLoadError('')}>{loadError} <span>×</span></button>}
    </div>
  );
}
