import { useState, type ReactNode } from 'react';
import {
  CheckSquare,
  Code2,
  Eye,
  Folder,
  Hash,
  ImagePlus,
  Link2,
  List,
  MoreHorizontal,
  Paperclip,
  Quote,
  Star,
  Trash2,
} from 'lucide-react';
import type { Note } from '../types';
import { countWords } from '../lib/knowledge';

interface Props {
  note: Note;
  onChange: (next: Note) => void;
  onDelete: () => void;
  onAttach: () => void;
  onOpenLink: (title: string) => void;
}

function renderInline(text: string, onOpenLink: (title: string) => void): ReactNode[] {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, index) => {
    const match = /^\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]$/.exec(part);
    if (!match) return part;
    return (
      <button className="wiki-link" key={index} onClick={() => onOpenLink(match[1].trim())}>
        <Link2 size={13} /> {match[1].trim()}
      </button>
    );
  });
}

function MarkdownPreview({
  content,
  onOpenLink,
}: {
  content: string;
  onOpenLink: (title: string) => void;
}) {
  return (
    <article className="markdown-preview">
      {content.split('\n').map((line, index) => {
        const heading = /^(#{1,4})\s+(.+)$/.exec(line);
        if (heading) {
          const Tag = ('h' + Math.min(heading[1].length + 1, 5)) as keyof JSX.IntrinsicElements;
          return <Tag key={index}>{renderInline(heading[2], onOpenLink)}</Tag>;
        }
        const task = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line);
        if (task) {
          return (
            <div className={'preview-task' + (task[1].toLowerCase() === 'x' ? ' done' : '')} key={index}>
              <span>{task[1].toLowerCase() === 'x' ? '✓' : ''}</span>
              {renderInline(task[2], onOpenLink)}
            </div>
          );
        }
        const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
        if (bullet) return <li key={index}>{renderInline(bullet[1], onOpenLink)}</li>;
        if (line.startsWith('> ')) return <blockquote key={index}>{line.slice(2)}</blockquote>;
        if (line.startsWith(String.fromCharCode(96).repeat(3))) return <div className="code-divider" key={index}><Code2 size={14} /> 代码块</div>;
        if (!line.trim()) return <div className="preview-spacer" key={index} />;
        return <p key={index}>{renderInline(line, onOpenLink)}</p>;
      })}
    </article>
  );
}

export function Editor({ note, onChange, onDelete, onAttach, onOpenLink }: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  const update = (patch: Partial<Note>) => {
    onChange({ ...note, ...patch, updatedAt: new Date().toISOString() });
  };

  return (
    <section className="editor">
      <header className="editor-header">
        <div className="breadcrumb">
          <Folder size={14} />
          <span>{note.folder || '未分类'}</span>
          <span>/</span>
          <strong>{note.title || '未命名'}</strong>
        </div>
        <div className="editor-actions">
          <div className="segmented">
            <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>
              <Code2 size={14} /> 编辑
            </button>
            <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>
              <Eye size={14} /> 阅读
            </button>
          </div>
          <button className={note.favorite ? 'icon-button active' : 'icon-button'} onClick={() => update({ favorite: !note.favorite })} aria-label="收藏">
            <Star size={17} fill={note.favorite ? 'currentColor' : 'none'} />
          </button>
          <button className="icon-button" onClick={onAttach} aria-label="添加附件"><Paperclip size={17} /></button>
          <button className="icon-button danger-hover" onClick={onDelete} aria-label="删除"><Trash2 size={17} /></button>
          <button className="icon-button" aria-label="更多"><MoreHorizontal size={18} /></button>
        </div>
      </header>

      <div className="editor-title-area">
        <input
          className="title-input"
          value={note.title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="未命名笔记"
        />
        <div className="note-meta-edit">
          <label><Folder size={14} /><input value={note.folder} onChange={(event) => update({ folder: event.target.value })} placeholder="文件夹" /></label>
          <label><Hash size={14} /><input value={note.tags.join(', ')} onChange={(event) => update({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} placeholder="标签，用逗号分隔" /></label>
        </div>
      </div>

      <div className="format-toolbar">
        <button title="标题"><span className="toolbar-letter">H</span></button>
        <button title="列表"><List size={16} /></button>
        <button title="任务"><CheckSquare size={16} /></button>
        <button title="引用"><Quote size={16} /></button>
        <button title="链接"><Link2 size={16} /></button>
        <button title="附件" onClick={onAttach}><ImagePlus size={16} /></button>
        <span className="toolbar-spacer" />
        <span className="save-indicator">已保存到本地</span>
      </div>

      {mode === 'edit' ? (
        <textarea
          className="content-editor"
          value={note.content}
          onChange={(event) => update({ content: event.target.value })}
          placeholder="开始记录。使用 [[笔记标题]] 创建链接，使用 - [ ] 创建任务。"
          spellCheck
        />
      ) : (
        <MarkdownPreview content={note.content} onOpenLink={onOpenLink} />
      )}

      <footer className="editor-footer">
        <span>{countWords(note.content)} 字</span>
        <span>Markdown</span>
        <span>上次修改 {new Date(note.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
      </footer>
    </section>
  );
}
