import { useMemo } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  type Node as FlowNode,
} from '@xyflow/react';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Database,
  FileText,
  Inbox,
  LayoutDashboard,
  Link2,
  Network,
  Plus,
  Sparkles,
  Tags,
} from 'lucide-react';
import { enabledFeatureNames, scenarioById } from '../lib/scenarios';
import {
  countWords,
  extractTasks,
  extractWikiLinks,
  noteExcerpt,
  type ParsedTask,
} from '../lib/knowledge';
import type { Note, WorkspaceSettings } from '../types';

interface CommonProps {
  notes: Note[];
  onOpenNote: (note: Note) => void;
  onCreateNote: () => void;
}

export function HomeView({
  notes,
  settings,
  onOpenNote,
  onCreateNote,
}: CommonProps & { settings: WorkspaceSettings }) {
  const tasks = notes.flatMap(extractTasks);
  const openTasks = tasks.filter((task) => !task.completed);
  const words = notes.reduce((total, note) => total + countWords(note.content), 0);
  const features = enabledFeatureNames(settings.enabledScenarios);

  return (
    <div className="view-scroll dashboard-view">
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">本地优先 · 数据由你掌控</span>
          <h1>欢迎回到 {settings.vaultName}</h1>
          <p>把记录、连接、检索和行动放在同一个安静的工作台里。</p>
        </div>
        <button className="primary-button" onClick={onCreateNote}><Plus size={17} /> 新建笔记</button>
      </section>

      <div className="metric-grid">
        <div className="metric-card"><span className="metric-icon blue"><FileText size={18} /></span><div><strong>{notes.length}</strong><small>笔记</small></div><em>全部可迁移</em></div>
        <div className="metric-card"><span className="metric-icon green"><CheckCircle2 size={18} /></span><div><strong>{openTasks.length}</strong><small>待办任务</small></div><em>{tasks.length - openTasks.length} 已完成</em></div>
        <div className="metric-card"><span className="metric-icon violet"><Link2 size={18} /></span><div><strong>{notes.reduce((n, note) => n + extractWikiLinks(note.content).length, 0)}</strong><small>知识连接</small></div><em>实时计算</em></div>
        <div className="metric-card"><span className="metric-icon amber"><BookOpen size={18} /></span><div><strong>{words}</strong><small>总字数</small></div><em>仅在本地</em></div>
      </div>

      <div className="dashboard-columns">
        <section className="dashboard-panel">
          <header><div><span className="panel-kicker">最近更新</span><h2>继续工作</h2></div><button>查看全部 <ArrowUpRight size={14} /></button></header>
          <div className="recent-list">
            {notes.slice(0, 5).map((note) => (
              <button key={note.id} onClick={() => onOpenNote(note)}>
                <span className="note-file-icon"><FileText size={17} /></span>
                <span><strong>{note.title}</strong><small>{noteExcerpt(note, 64) || '空白笔记'}</small></span>
                <time>{new Date(note.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</time>
              </button>
            ))}
            {!notes.length && <div className="empty-state compact"><Inbox size={22} /><p>创建第一篇笔记，开始积累你的知识。</p></div>}
          </div>
        </section>

        <section className="dashboard-panel focus-panel">
          <header><div><span className="panel-kicker">今日焦点</span><h2>接下来要做</h2></div><Clock3 size={18} /></header>
          <div className="focus-list">
            {openTasks.slice(0, 5).map((task) => (
              <button key={task.id} onClick={() => onOpenNote(notes.find((note) => note.id === task.noteId)!)}>
                <Circle size={16} /><span><strong>{task.text}</strong><small>{task.noteTitle}</small></span>
              </button>
            ))}
            {!openTasks.length && <div className="empty-state compact"><CheckCircle2 size={22} /><p>今天没有未完成任务。</p></div>}
          </div>
        </section>
      </div>

      <section className="mode-strip">
        <div><span className="panel-kicker">统一内核 · 场景模式</span><h2>当前启用的工作流</h2></div>
        <div className="mode-pills">
          {settings.enabledScenarios.map((id) => {
            const scenario = scenarioById(id);
            return scenario && <span key={id} style={{ '--pill': scenario.color } as React.CSSProperties}>{scenario.name}</span>;
          })}
        </div>
        <div className="feature-line">{features.slice(0, 10).map((feature) => <span key={feature}>{feature}</span>)}</div>
      </section>
    </div>
  );
}

export function DatabaseView({ notes, onOpenNote, onCreateNote }: CommonProps) {
  const allTags = [...new Set(notes.flatMap((note) => note.tags))];
  return (
    <div className="view-scroll data-view">
      <header className="view-heading">
        <div><span className="panel-kicker">结构化知识</span><h1>数据库</h1><p>所有字段直接来自 Markdown frontmatter。</p></div>
        <button className="primary-button" onClick={onCreateNote}><Plus size={16} /> 新建记录</button>
      </header>
      <div className="view-toolbar"><span><Database size={15} /> 全部笔记</span><span><Tags size={15} /> {allTags.length} 个标签</span><button>筛选</button><button>排序</button></div>
      <div className="database-table">
        <div className="database-row header"><span>标题</span><span>文件夹</span><span>标签</span><span>类型</span><span>更新时间</span></div>
        {notes.map((note) => (
          <button className="database-row" key={note.id} onClick={() => onOpenNote(note)}>
            <span><FileText size={15} />{note.title}</span>
            <span>{note.folder || '未分类'}</span>
            <span className="cell-tags">{note.tags.slice(0, 2).map((tag) => <em key={tag}>{tag}</em>)}</span>
            <span>{note.properties.type || '笔记'}</span>
            <span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TasksView({
  notes,
  onOpenNote,
  onToggleTask,
}: CommonProps & { onToggleTask: (task: ParsedTask) => void }) {
  const tasks = notes.flatMap(extractTasks);
  const open = tasks.filter((task) => !task.completed);
  const done = tasks.filter((task) => task.completed);
  return (
    <div className="view-scroll tasks-view">
      <header className="view-heading"><div><span className="panel-kicker">从笔记中自动汇总</span><h1>任务</h1><p>勾选状态会直接回写原始 Markdown。</p></div><div className="completion-ring"><strong>{tasks.length ? Math.round(done.length / tasks.length * 100) : 0}%</strong><small>完成</small></div></header>
      <TaskGroup title="待完成" tasks={open} notes={notes} onOpenNote={onOpenNote} onToggleTask={onToggleTask} />
      <TaskGroup title="已完成" tasks={done} notes={notes} onOpenNote={onOpenNote} onToggleTask={onToggleTask} completed />
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  notes,
  onOpenNote,
  onToggleTask,
  completed,
}: {
  title: string;
  tasks: ParsedTask[];
  notes: Note[];
  onOpenNote: (note: Note) => void;
  onToggleTask: (task: ParsedTask) => void;
  completed?: boolean;
}) {
  return (
    <section className="task-group">
      <header><h2>{title}</h2><span>{tasks.length}</span></header>
      {tasks.map((task) => (
        <div className={'task-row' + (completed ? ' completed' : '')} key={task.id}>
          <button className="task-checkbox" onClick={() => onToggleTask(task)}>{task.completed && '✓'}</button>
          <button className="task-copy" onClick={() => onOpenNote(notes.find((note) => note.id === task.noteId)!)}>
            <strong>{task.text}</strong><small><FileText size={12} /> {task.noteTitle}</small>
          </button>
          <span>本地</span>
        </div>
      ))}
      {!tasks.length && <div className="empty-state compact"><CheckCircle2 size={22} /><p>这里还没有任务。</p></div>}
    </section>
  );
}

export function CalendarView({ notes, onOpenNote }: CommonProps) {
  const dated = notes.filter((note) => note.properties.date || note.properties.due);
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
  return (
    <div className="view-scroll calendar-view">
      <header className="view-heading"><div><span className="panel-kicker">日期属性驱动</span><h1>日历</h1><p>为笔记添加 date 或 due 属性即可出现在这里。</p></div><CalendarDays size={26} /></header>
      <div className="calendar-grid">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const items = dated.filter((note) => (note.properties.date || note.properties.due) === key);
          return (
            <div className="calendar-day" key={key}>
              <header><span>{day.toLocaleDateString('zh-CN', { weekday: 'short' })}</span><strong>{day.getDate()}</strong></header>
              {items.map((note) => <button key={note.id} onClick={() => onOpenNote(note)}>{note.title}</button>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GraphView({ notes, onOpenNote }: CommonProps) {
  const visible = notes.slice(0, 14);
  const positions = visible.map((note, index) => {
    const angle = (index / Math.max(visible.length, 1)) * Math.PI * 2;
    return { note, x: 400 + Math.cos(angle) * 260, y: 260 + Math.sin(angle) * 190 };
  });
  const edges = positions.flatMap((source) =>
    extractWikiLinks(source.note.content).flatMap((title) => {
      const target = positions.find((item) => item.note.title === title);
      return target ? [{ source, target }] : [];
    }),
  );
  return (
    <div className="graph-view">
      <header className="floating-view-heading"><span><Network size={17} /> 知识图谱</span><small>{visible.length} 节点 · {edges.length} 连接</small></header>
      <svg viewBox="0 0 800 520" role="img" aria-label="笔记关系图">
        <g className="graph-edges">{edges.map((edge, index) => <line key={index} x1={edge.source.x} y1={edge.source.y} x2={edge.target.x} y2={edge.target.y} />)}</g>
        <g className="graph-nodes">{positions.map(({ note, x, y }, index) => <g key={note.id} transform={'translate(' + x + ',' + y + ')'} onClick={() => onOpenNote(note)}><circle r={index < 3 ? 27 : 21} /><text y={38}>{note.title.slice(0, 10)}</text></g>)}</g>
      </svg>
    </div>
  );
}

export function CanvasView({ notes, onOpenNote }: CommonProps) {
  const nodes = useMemo<FlowNode[]>(
    () => notes.slice(0, 12).map((note, index) => ({
      id: note.id,
      position: { x: 60 + (index % 3) * 260, y: 60 + Math.floor(index / 3) * 150 },
      data: { label: note.title },
      style: {
        border: '1px solid #d9dfeb',
        borderRadius: 14,
        background: '#fff',
        padding: 16,
        width: 210,
        boxShadow: '0 10px 28px rgba(25, 36, 63, .08)',
      },
    })),
    [notes],
  );
  return (
    <div className="canvas-view">
      <header className="floating-view-heading"><span><LayoutDashboard size={17} /> Canvas</span><small>拖动卡片整理想法，双击打开笔记</small></header>
      <ReactFlow nodes={nodes} edges={[]} fitView onNodeDoubleClick={(_event, node) => {
        const note = notes.find((item) => item.id === node.id);
        if (note) onOpenNote(note);
      }}>
        <Background color="#d8deea" gap={22} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function TrashView() {
  return <div className="empty-state full"><div className="empty-orb"><Inbox size={24} /></div><h2>回收站</h2><p>删除的 Markdown 文件会移动到知识库的 .knowledge/trash 目录。</p></div>;
}
