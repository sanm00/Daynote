import type { StateCreator } from 'zustand';
import type {
  ChartType,
  Note,
  Page,
  PlanViewKind,
  ReviewRange,
  SearchType,
  Settings,
  Tag,
  TagDefinition,
  Task,
  TaskRange,
  ThemeMode,
} from '@/types';
import type { StorageKind } from '@/lib/storage';

export interface PlanView {
  kind: PlanViewKind;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface TagSlice {
  tags: TagDefinition[];
  saveTag: (tag: Omit<TagDefinition, 'id'>, id?: string) => void;
  deleteTag: (id: string, replacement: string) => void;
  moveTag: (id: string, direction: -1 | 1) => void;
  setTaskTag: (id: number, tag: string) => void;
}

export interface DataSlice {
  // data
  tasks: Task[];
  notes: Note[];
  settings: Settings;

  // persistence metadata
  ready: boolean;
  storageKind: StorageKind;
  storagePath: string | null;
  saveState: SaveState;

  toggleTodo: (id: number) => void;
  updateTask: (id: number, patch: Partial<Pick<Task, 'title' | 'tag'>>) => void;
  deleteTask: (id: number) => void;
  rescheduleTask: (id: number, range: TaskRange | null) => void;
  submitQuickAdd: (title: string) => void;
  postponeUnfinished: () => void;
  moveAllToToday: (ids: number[]) => void;

  deleteNote: (id: number) => void;
  resetAll: () => void;
  importData: (data: { tasks?: unknown; notes?: unknown; settings?: unknown; tags?: unknown }) => void;
}

export interface UiSlice {
  // navigation
  page: Page;
  prevPage: Page;
  planView: PlanView;
  selectedDate: string;
  calMonth: Date;
  reviewRange: ReviewRange;
  chartType: ChartType;
  addBegin: string;
  addEnd: string;
  addTag: Tag;
  popMonth: Date;
  reschedulingId: number | null;
  noteFilter: Tag | 'all';
  noteMode: 'preview' | 'edit';
  currentNoteId: number | null;
  /** Uncommitted note buffer. Lives only in memory (never persisted) so editing
   * and new notes are written to disk only on explicit save or when leaving. */
  noteDraft: Note | null;
  searchQuery: string;
  searchType: SearchType;
  findOpen: boolean;
  findQuery: string;
  findIndex: number;
  findCase: boolean;
  newTodoPending: boolean;
  newNotePending: boolean;

  setPage: (page: Page) => void;
  openSearch: () => void;
  closeSearch: () => void;
  requestNewTodo: () => void;
  requestNewNote: () => void;
  consumeNewTodo: () => void;
  consumeNewNote: () => void;
  setPlanView: (kind: PlanViewKind) => void;
  goToDate: (date: string, syncAddDate?: boolean) => void;
  setCalMonth: (d: Date) => void;
  setReviewRange: (r: ReviewRange) => void;
  setChartType: (t: ChartType) => void;
  setAddRange: (begin: string, end: string) => void;
  setAddTag: (t: Tag) => void;
  setReschedulingId: (id: number | null) => void;
  setNoteFilter: (f: Tag | 'all') => void;
  setNoteMode: (m: 'preview' | 'edit') => void;
  selectNote: (id: number) => void;
  newNoteDraft: () => void;
  editDraft: (patch: Partial<Pick<Note, 'title' | 'content' | 'tag'>>) => void;
  /** Commit the draft into `notes` (or drop an abandoned blank new note). */
  commitDraft: () => void;
  /** Throw the draft away, reverting the note to its last saved content. */
  discardDraft: () => void;
  setSearchQuery: (q: string) => void;
  setSearchType: (t: SearchType) => void;
  setTheme: (t: ThemeMode) => void;
  setDefaultTag: (t: Tag) => void;
  applyTheme: () => void;
}

export interface PersistSlice {
  hydrateFromStorage: () => Promise<void>;
  persistNow: () => Promise<void>;
}

export type AppStore = TagSlice & DataSlice & UiSlice & PersistSlice;

/** A zustand slice creator bound to the combined `AppStore`. */
export type SliceCreator<T> = StateCreator<AppStore, [], [], T>;
