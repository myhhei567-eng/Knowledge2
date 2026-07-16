import { describe, expect, it } from 'vitest';
import {
  backlinksFor,
  countWords,
  extractHeadings,
  extractTasks,
  extractWikiLinks,
  noteExcerpt,
  searchNotes,
  toggleTaskInContent,
} from '../src/lib/knowledge';
import type { Note } from '../src/types';

function makeNote(id: string, title: string, content: string, overrides: Partial<Note> = {}): Note {
  return {
    id, title, content, folder: '收件箱', tags: [], properties: {}, favorite: false,
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('knowledge parsing', () => {
  it('counts Chinese characters and Latin words', () => {
    expect(countWords('知识 local-first app 2026')).toBe(5);
  });

  it('extracts headings, unique wiki links and tasks', () => {
    const content = '# 标题\n## 子标题\n[[项目 A]] [[项目 A|别名]] [[资料#章节]]\n- [ ] 待办\n* [x] 完成';
    const source = makeNote('source', '来源', content);
    expect(extractHeadings(content)).toEqual([
      { level: 1, text: '标题', line: 0 },
      { level: 2, text: '子标题', line: 1 },
    ]);
    expect(extractWikiLinks(content)).toEqual(['项目 A', '资料']);
    expect(extractTasks(source)).toMatchObject([
      { noteId: 'source', text: '待办', completed: false, line: 3 },
      { noteId: 'source', text: '完成', completed: true, line: 4 },
    ]);
  });

  it('toggles only the requested task line', () => {
    const content = '- [ ] 第一项\n- [x] 第二项';
    expect(toggleTaskInContent(content, 1)).toBe('- [ ] 第一项\n- [ ] 第二项');
    expect(toggleTaskInContent(content, 0)).toBe('- [x] 第一项\n- [x] 第二项');
  });
});

describe('knowledge relationships and discovery', () => {
  const target = makeNote('target', '核心概念', '# 核心概念');
  const linked = makeNote('linked', '相关笔记', '参考 [[核心概念]]');
  const unrelated = makeNote('unrelated', '其它', '没有链接', {
    folder: '研究', tags: ['文献'], properties: { status: '精读' },
  });

  it('finds backlinks and searches all metadata', () => {
    const notes = [target, linked, unrelated];
    expect(backlinksFor(target, notes).map((item) => item.id)).toEqual(['linked']);
    expect(searchNotes(notes, '核心')).toHaveLength(2);
    expect(searchNotes(notes, '文献')).toEqual([unrelated]);
    expect(searchNotes(notes, '精读')).toEqual([unrelated]);
    expect(searchNotes(notes, '')).toEqual(notes);
  });

  it('creates a clean, bounded excerpt', () => {
    expect(noteExcerpt(makeNote('1', '标题', '# 标题\n关联 [[另一页]]\n很多内容'), 10))
      .toBe('标题 关联 另一页…');
  });
});
