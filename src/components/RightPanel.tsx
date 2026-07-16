import { useMemo, useState } from 'react';
import { FileText, Link2, ListTree, Plus, Tag, X } from 'lucide-react';
import { backlinksFor, extractHeadings, extractWikiLinks } from '../lib/knowledge';
import type { Note } from '../types';

interface Props {
  note?: Note;
  notes: Note[];
  onOpenNote: (note: Note) => void;
  onChange: (note: Note) => void;
}

type Tab = 'outline' | 'properties' | 'links';

export function RightPanel({ note, notes, onOpenNote, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('outline');
  const headings = useMemo(() => (note ? extractHeadings(note.content) : []), [note]);
  const backlinks = useMemo(() => (note ? backlinksFor(note, notes) : []), [note, notes]);
  const outgoing = useMemo(() => (note ? extractWikiLinks(note.content) : []), [note]);

  if (!note) {
    return (
      <aside className="right-panel empty-right">
        <div className="empty-orb"><ListTree size={22} /></div>
        <strong>上下文面板</strong>
        <p>打开一篇笔记后，这里会显示大纲、属性、反向链接和相关内容。</p>
      </aside>
    );
  }

  const setProperty = (key: string, value: string) => {
    onChange({ ...note, properties: { ...note.properties, [key]: value } });
  };

  const removeProperty = (key: string) => {
    const next = { ...note.properties };
    delete next[key];
    onChange({ ...note, properties: next });
  };

  const addProperty = () => {
    let index = 1;
    let key = '新属性';
    while (key in note.properties) key = '新属性' + ++index;
    setProperty(key, '');
  };

  return (
    <aside className="right-panel">
      <div className="right-tabs">
        <button className={tab === 'outline' ? 'active' : ''} onClick={() => setTab('outline')}>
          <ListTree size={15} /> 大纲
        </button>
        <button className={tab === 'properties' ? 'active' : ''} onClick={() => setTab('properties')}>
          <Tag size={15} /> 属性
        </button>
        <button className={tab === 'links' ? 'active' : ''} onClick={() => setTab('links')}>
          <Link2 size={15} /> 链接
        </button>
      </div>

      <div className="right-content">
        {tab === 'outline' && (
          <section>
            <div className="panel-heading">本文大纲 <span>{headings.length}</span></div>
            <div className="outline-list">
              {headings.map((heading) => (
                <button key={heading.line} style={{ paddingLeft: 10 + (heading.level - 1) * 12 }}>
                  <span>{heading.text}</span>
                </button>
              ))}
              {!headings.length && <p className="panel-empty">添加 Markdown 标题后会自动生成大纲。</p>}
            </div>
          </section>
        )}

        {tab === 'properties' && (
          <section>
            <div className="panel-heading">笔记属性 <button onClick={addProperty}><Plus size={14} /></button></div>
            <div className="property-list">
              {Object.entries(note.properties).map(([key, value]) => (
                <div className="property-row" key={key}>
                  <span>{key}</span>
                  <input value={value} onChange={(event) => setProperty(key, event.target.value)} />
                  <button onClick={() => removeProperty(key)}><X size={13} /></button>
                </div>
              ))}
              {!Object.keys(note.properties).length && <p className="panel-empty">用属性描述日期、状态、类型或项目。</p>}
            </div>
            <div className="panel-heading panel-heading-spaced">标签 <span>{note.tags.length}</span></div>
            <div className="tag-cloud">
              {note.tags.map((tag) => <span key={tag}>#{tag}</span>)}
              {!note.tags.length && <p className="panel-empty">暂无标签</p>}
            </div>
          </section>
        )}

        {tab === 'links' && (
          <section>
            <div className="panel-heading">反向链接 <span>{backlinks.length}</span></div>
            <div className="linked-note-list">
              {backlinks.map((item) => (
                <button key={item.id} onClick={() => onOpenNote(item)}>
                  <FileText size={15} /><span><strong>{item.title}</strong><small>{item.folder || '未分类'}</small></span>
                </button>
              ))}
              {!backlinks.length && <p className="panel-empty">还没有其他笔记链接到这里。</p>}
            </div>
            <div className="panel-heading panel-heading-spaced">出链 <span>{outgoing.length}</span></div>
            <div className="outgoing-links">
              {outgoing.map((title) => {
                const target = notes.find((item) => item.title === title);
                return (
                  <button key={title} onClick={() => target && onOpenNote(target)} disabled={!target}>
                    <Link2 size={13} />{title}
                  </button>
                );
              })}
              {!outgoing.length && <p className="panel-empty">使用 [[笔记标题]] 建立知识连接。</p>}
            </div>
          </section>
        )}
      </div>

      <div className="context-card">
        <span>相关笔记</span>
        <strong>{backlinks.length + outgoing.length}</strong>
        <small>依据双向链接实时计算</small>
      </div>
    </aside>
  );
}
