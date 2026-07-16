import type { Note } from '../types';

export interface ParsedTask {
  id: string;
  noteId: string;
  noteTitle: string;
  text: string;
  completed: boolean;
  line: number;
}

export function countWords(content: string): number {
  const chinese = content.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latin = content
    .replace(/[\u3400-\u9fff]/g, ' ')
    .match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;
  return chinese + latin;
}

export function extractHeadings(content: string) {
  return content
    .split('\n')
    .map((line, index) => {
      const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
      return match ? { level: match[1].length, text: match[2].trim(), line: index } : null;
    })
    .filter((item): item is { level: number; text: string; line: number } => Boolean(item));
}

export function extractWikiLinks(content: string): string[] {
  const links = [...content.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]+)?\]\]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  return [...new Set(links)];
}

export function extractTasks(note: Note): ParsedTask[] {
  return note.content
    .split('\n')
    .map((line, index) => {
      const match = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line);
      if (!match) return null;
      return {
        id: note.id + ':' + index,
        noteId: note.id,
        noteTitle: note.title,
        text: match[2].trim(),
        completed: match[1].toLowerCase() === 'x',
        line: index,
      };
    })
    .filter((task): task is ParsedTask => Boolean(task));
}

export function toggleTaskInContent(content: string, line: number): string {
  return content
    .split('\n')
    .map((value, index) => {
      if (index !== line) return value;
      return value.replace(/^(\s*[-*]\s+)\[([ xX])\]/, (_match, prefix, state) => {
        return prefix + (state.toLowerCase() === 'x' ? '[ ]' : '[x]');
      });
    })
    .join('\n');
}

export function backlinksFor(target: Note, notes: Note[]): Note[] {
  const normalized = target.title.trim().toLocaleLowerCase();
  return notes.filter((note) =>
    extractWikiLinks(note.content).some((link) => link.toLocaleLowerCase() === normalized),
  );
}

export function searchNotes(notes: Note[], query: string): Note[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return notes;
  return notes.filter((note) => {
    const haystack = [
      note.title,
      note.content,
      note.folder,
      note.tags.join(' '),
      Object.entries(note.properties).flat().join(' '),
    ]
      .join('\n')
      .toLocaleLowerCase();
    return haystack.includes(normalized);
  });
}

export function noteExcerpt(note: Note, length = 120): string {
  const plain = note.content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > length ? plain.slice(0, length).trimEnd() + '…' : plain;
}
