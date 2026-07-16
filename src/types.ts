export type ScenarioId = 'study' | 'work' | 'personal' | 'research' | 'creation' | 'blank';

export type ViewId =
  | 'home'
  | 'inbox'
  | 'notes'
  | 'favorites'
  | 'database'
  | 'tasks'
  | 'calendar'
  | 'canvas'
  | 'graph'
  | 'trash';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  description: string;
  color: string;
  icon: string;
  features: string[];
  starterNotes: Array<Pick<Note, 'title' | 'folder' | 'content' | 'tags' | 'properties'>>;
}

export interface Note {
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

export interface WorkspaceSettings {
  vaultName: string;
  vaultPath: string;
  enabledScenarios: ScenarioId[];
  ai?: {
    enabled: boolean;
    providerName: string;
    endpoint: string;
    model: string;
    hasKey: boolean;
  };
}

export interface WorkspaceSnapshot {
  settings: WorkspaceSettings;
  notes: Note[];
}

export interface SaveNoteResult {
  note: Note;
  previousPath?: string;
}

export interface AiRequest {
  instruction: string;
  context: Array<{ noteId: string; title: string; content: string }>;
}

export interface AiResponse {
  text: string;
  provider: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface KnowledgeBridge {
  loadWorkspace(): Promise<WorkspaceSnapshot>;
  chooseVault(): Promise<WorkspaceSnapshot | null>;
  saveSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings>;
  saveNote(note: Note): Promise<SaveNoteResult>;
  deleteNote(noteId: string): Promise<void>;
  attachFile(noteId: string): Promise<{ name: string; relativePath: string } | null>;
  configureAi(config: {
    providerName: string;
    endpoint: string;
    model: string;
    apiKey?: string;
  }): Promise<WorkspaceSettings['ai']>;
  runAi(request: AiRequest): Promise<AiResponse>;
}

declare global {
  interface Window {
    knowledge?: KnowledgeBridge;
  }
}
