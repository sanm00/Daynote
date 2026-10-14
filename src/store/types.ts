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
  Task,
  ThemeMode,
} from '@/types';
import type { StorageKind } from '@/lib/storage';

export interface PlanView {
  kind: PlanViewKind;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

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
  cycleTag: (id: number) => void;
  updateTask: (id: number, patch: Partial<Pick<Task, 'title'>>) => void;
  deleteTask: (id: number) => void;
  rescheduleTask: (id: number, date: string | null) => void;
  submitQuickAdd: (title: string) => void;
  postponeUnfinished: () => void;
  moveAllToToday: (ids: number[]) => void;

  createNote: () => void;
  updateNote: (id: number, patch: Partial<Pick<Note, 'title' | 'content' | 'tag'>>) => void;
  deleteNote: (id: number) => void;
  finalizeNote: (id: number | null) => void;
  resetAll: () => void;
  importData: (data: { tasks?: unknown; notes?: unknown; settings?: unknown }) => void;
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
  addDate: string;
  addTag: Tag;
  popMonth: Date;
  reschedulingId: number | null;
  noteFilter: Tag | 'all';
  noteMode: 'preview' | 'edit';
  currentNoteId: number | null;
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
  setAddDate: (d: string) => void;
  setAddTag: (t: Tag) => void;
  setReschedulingId: (id: number | null) => void;
  setNoteFilter: (f: Tag | 'all') => void;
  setNoteMode: (m: 'preview' | 'edit') => void;
  selectNote: (id: number) => void;
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

export type AppStore = DataSlice & UiSlice & PersistSlice;

/** A zustand slice creator bound to the combined `AppStore`. */
export type SliceCreator<T> = StateCreator<AppStore, [], [], T>;
