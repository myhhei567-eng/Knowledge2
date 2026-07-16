import {
  Archive,
  CalendarDays,
  CheckSquare,
  Database,
  FileText,
  FolderKanban,
  Share2,
  Home,
  Inbox,
  LayoutDashboard,
  Network,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import type { ViewId } from '../types';

interface Props {
  active: ViewId;
  noteCount: number;
  taskCount: number;
  favoriteCount: number;
  folders: string[];
  onSelect: (view: ViewId) => void;
  onCreateNote: (folder?: string) => void;
}

const primary = [
  { id: 'home' as const, label: '首页', icon: Home },
  { id: 'inbox' as const, label: '收件箱', icon: Inbox },
  { id: 'notes' as const, label: '所有笔记', icon: FileText },
  { id: 'favorites' as const, label: '收藏', icon: Star },
];

const tools = [
  { id: 'database' as const, label: '数据库', icon: Database },
  { id: 'tasks' as const, label: '任务', icon: CheckSquare },
  { id: 'calendar' as const, label: '日历', icon: CalendarDays },
  { id: 'canvas' as const, label: 'Canvas', icon: LayoutDashboard },
  { id: 'graph' as const, label: '图谱', icon: Network },
];

export function Sidebar({
  active,
  noteCount,
  taskCount,
  favoriteCount,
  folders,
  onSelect,
  onCreateNote,
}: Props) {
  const countFor = (id: ViewId) => {
    if (id === 'notes') return noteCount;
    if (id === 'tasks') return taskCount;
    if (id === 'favorites') return favoriteCount;
    return undefined;
  };

  const renderItems = (items: typeof primary | typeof tools) =>
    items.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        className={'nav-item' + (active === id ? ' active' : '')}
        onClick={() => onSelect(id)}
      >
        <Icon size={17} strokeWidth={1.9} />
        <span>{label}</span>
        {countFor(id) !== undefined && <small>{countFor(id)}</small>}
      </button>
    ));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo"><Share2 size={19} /></div>
        <div>
          <strong>Knowledge</strong>
          <span>本地知识工作台</span>
        </div>
      </div>

      <button className="new-note-button" onClick={() => onCreateNote()}>
        <Plus size={17} />
        新建笔记
        <kbd>⌘ N</kbd>
      </button>

      <nav className="nav-section">{renderItems(primary)}</nav>

      <div className="nav-label">知识工具</div>
      <nav className="nav-section">{renderItems(tools)}</nav>

      <div className="nav-label nav-label-row">
        <span>文件夹</span>
        <button aria-label="新建文件夹" onClick={() => onCreateNote('新建文件夹')}>
          <Plus size={14} />
        </button>
      </div>
      <nav className="folder-list">
        {folders.slice(0, 7).map((folder) => (
          <button key={folder} onClick={() => { onSelect('notes'); onCreateNote(folder); }}>
            <FolderKanban size={15} />
            <span>{folder}</span>
          </button>
        ))}
        {!folders.length && (
          <div className="folder-empty"><Archive size={15} /> 暂无文件夹</div>
        )}
      </nav>

      <button
        className={'nav-item trash-nav' + (active === 'trash' ? ' active' : '')}
        onClick={() => onSelect('trash')}
      >
        <Trash2 size={17} />
        <span>回收站</span>
      </button>
    </aside>
  );
}
