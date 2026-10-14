import { create } from 'zustand';
import type {
  ChartType,
  Note,
  Page,
  PlanViewKind,
  Priority,
  ReviewRange,
  SearchType,
  Settings,
  Tag,
  Task,
  ThemeMode,
} from '@/types';
import { addDays, fmt, parseDate, today, todayStr } from '@/lib/date';
import { generateDemoNotes, generateDemoTasks } from '@/lib/seed';
import { nextTag } from '@/lib/tags';
import { plainText } from '@/lib/markdown';
import { storage, type StorageKind, type StoreData } from '@/lib/storage';
import { SCHEMA_VERSION } from '@/lib/constants';
import { sanitizeNotes, sanitizeSettings, sanitizeTasks } from '@/lib/sanitize';

export interface PlanView {
  kind: PlanViewKind;
}

/**
 * Ids of notes whose title the user has touched at least once. A note not in
 * this set keeps its empty title mirrored from the body (first 50 chars).
 */
const touchedTitles = new Set<number>();

/** First 50 characters of the note body, used as a fallback title. */
function deriveTitle(content: string): string {
  return plainText(content).slice(0, 50).trim();
}

function isBlankNote(note: Note): boolean {
  return !note.title.trim() && !note.content.trim();
}

export interface AppStore {
  // data
  tasks: Task[];
  notes: Note[];
  settings: Settings;

  // persistence
  ready: boolean;
  storageKind: StorageKind;
  storagePath: string | null;

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

  // actions
  hydrateFromStorage: () => Promise<void>;
  persistNow: () => Promise<void>;

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

  toggleTodo: (id: number) => void;
  cycleTag: (id: number) => void;
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

export const useAppStore = create<AppStore>((set, get) => ({  tasks: [],
  notes: [],
  settings: { theme: 'light', defaultTag: '工作' },

  ready: false,
  storageKind: storage.kind,
  storagePath: null,

  page: 'plan',
  prevPage: 'plan',
  planView: { kind: 'date' },
  selectedDate: todayStr(),
  calMonth: new Date(today().getFullYear(), today().getMonth(), 1),
  reviewRange: 'today',
  chartType: 'bar',
  addDate: '',
  addTag: '工作',
  popMonth: new Date(today().getFullYear(), today().getMonth(), 1),
  reschedulingId: null,
  noteFilter: 'all',
  noteMode: 'preview',
  currentNoteId: null,
  searchQuery: '',
  searchType: 'all',
  findOpen: false,
  findQuery: '',
  findIndex: 0,
  findCase: false,
  newTodoPending: false,
  newNotePending: false,

  hydrateFromStorage: async () => {
    let loaded: StoreData | null = null;
    try {
      loaded = await storage.load();
    } catch (error) {
      console.error('加载本地数据失败', error);
    }
    touchedTitles.clear();

    if (loaded) {
      const notes = loaded.notes.filter((n) => !isBlankNote(n));
      // Existing notes keep whatever title they were saved with; only titleless
      // notes are allowed to keep mirroring their body.
      for (const n of notes) if (n.title.trim()) touchedTitles.add(n.id);
      set({
        settings: loaded.settings,
        tasks: loaded.tasks,
        notes,
        addTag: loaded.settings.defaultTag,
        currentNoteId: notes.length ? notes[0].id : null,
        ready: true,
        storageKind: storage.kind,
      });
    } else {
      // First run: start from the demo dataset so the app is not empty, and
      // write it straight away so the storage root is populated on launch.
      const tasks = generateDemoTasks();
      const notes = generateDemoNotes();
      set({
        tasks,
        notes,
        currentNoteId: notes.length ? notes[0].id : null,
        ready: true,
        storageKind: storage.kind,
      });
      const { settings } = get();
      try {
        await storage.save({ version: SCHEMA_VERSION, settings, tasks, notes });
      } catch (error) {
        console.error('初始化本地数据失败', error);
      }
    }

    try {
      set({ storagePath: await storage.root() });
    } catch {
      /* ignore */
    }

    get().applyTheme();
  },

  persistNow: async () => {
    const { settings, tasks, notes } = get();
    try {
      // Never persist blank notes (a new note the user abandoned).
      const persistable = notes.filter((n) => !isBlankNote(n));
      await storage.save({ version: SCHEMA_VERSION, settings, tasks, notes: persistable });
    } catch (error) {
      console.error('保存本地数据失败', error);
    }
  },

  setPage: (page) => {
    const s = get();
    if (s.page === 'notes' && page !== 'notes') s.finalizeNote(s.currentNoteId);
    set({ page, prevPage: page === 'search' ? s.prevPage : s.page });
  },
  openSearch: () => {
    const cur = get().page;
    set({ page: 'search', prevPage: cur === 'search' ? get().prevPage : cur });
  },
  closeSearch: () => {
    const { prevPage } = get();
    set({ page: prevPage === 'search' ? 'plan' : prevPage });
  },
  requestNewTodo: () =>
    set({
      page: 'plan',
      reschedulingId: null,
      newTodoPending: true,
    }),
  consumeNewTodo: () => set({ newTodoPending: false }),
  requestNewNote: () =>
    set({
      page: 'notes',
      noteFilter: 'all',
      newNotePending: true,
    }),
  consumeNewNote: () => set({ newNotePending: false }),
  setPlanView: (kind) => set({ planView: { kind }, reschedulingId: null }),
  goToDate: (date, syncAddDate = true) => {
    const d = parseDate(date);
    set((s) => ({
      planView: { kind: 'date' },
      selectedDate: date,
      calMonth: new Date(d.getFullYear(), d.getMonth(), 1),
      reschedulingId: null,
      addDate: syncAddDate ? date : s.addDate,
    }));
  },
  setCalMonth: (calMonth) => set({ calMonth }),
  setReviewRange: (reviewRange) => set({ reviewRange }),
  setChartType: (chartType) => set({ chartType }),
  setAddDate: (addDate) => set({ addDate }),
  setAddTag: (addTag) => set({ addTag }),
  setReschedulingId: (reschedulingId) => set({ reschedulingId }),
  setNoteFilter: (noteFilter) => set({ noteFilter }),
  setNoteMode: (noteMode) => set({ noteMode }),
  selectNote: (currentNoteId) => {
    const s = get();
    if (s.currentNoteId != null && s.currentNoteId !== currentNoteId) {
      s.finalizeNote(s.currentNoteId);
    }
    set({ currentNoteId });
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchType: (searchType) => set({ searchType }),
  setTheme: (theme) => {
    set((s) => ({ settings: { ...s.settings, theme } }));
    get().applyTheme();
  },
  setDefaultTag: (defaultTag) => {
    set((s) => ({ settings: { ...s.settings, defaultTag }, addTag: defaultTag }));
  },
  applyTheme: () => {
    const mode = get().settings.theme;
    const resolved =
      mode === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : mode;
    document.documentElement.setAttribute('data-theme', resolved);
  },

  toggleTodo: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null }
          : t,
      ),
    })),
  cycleTag: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, tag: nextTag(t.tag) } : t)),
    })),
  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  rescheduleTask: (id, date) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, date } : t)),
      reschedulingId: null,
    })),
  submitQuickAdd: (title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const { addDate, addTag } = get();
    set((s) => ({
      tasks: [
        ...s.tasks,
        {
          id: Math.max(0, ...s.tasks.map((t) => t.id)) + 1,
          title: trimmed,
          tag: addTag,
          prio: 'mid' as Priority,
          date: addDate || null,
          done: false,
          doneAt: null,
          source: 'quick',
          parsedAt: new Date().toISOString(),
        },
      ],
      addDate: '',
    }));
  },
  postponeUnfinished: () => {
    const from = get().selectedDate;
    const to = fmt(addDays(parseDate(from), 1));
    set((s) => ({
      tasks: s.tasks.map((t) => (t.date === from && !t.done ? { ...t, date: to } : t)),
    }));
  },
  moveAllToToday: (ids) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (ids.includes(t.id) ? { ...t, date: todayStr() } : t)),
    })),

  createNote: () => {
    const now = new Date().toISOString();
    const note: Note = {
      id: Math.max(0, ...get().notes.map((n) => n.id)) + 1,
      title: '',
      content: '',
      tag: get().settings.defaultTag,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ notes: [note, ...s.notes], currentNoteId: note.id, noteFilter: 'all' }));
  },
  updateNote: (id, patch) => {
    if (patch.title !== undefined) touchedTitles.add(id);
    set((s) => ({
      notes: s.notes.map((n) => {
        if (n.id !== id) return n;
        const next: Note = { ...n, ...patch, updatedAt: new Date().toISOString() };
        // Until the user touches the title, it mirrors the body: typing names
        // the note (first 50 chars of plain text), clearing the body empties it.
        if (patch.content !== undefined && !touchedTitles.has(id)) {
          next.title = deriveTitle(next.content);
        }
        return next;
      }),
    }));
  },
  deleteNote: (id) =>
    set((s) => {
      touchedTitles.delete(id);
      const notes = s.notes.filter((n) => n.id !== id);
      const currentNoteId =
        s.currentNoteId === id ? (notes.length ? notes[0].id : null) : s.currentNoteId;
      return { notes, currentNoteId };
    }),
  finalizeNote: (id) => {
    if (id == null) return;
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    if (isBlankNote(note)) {
      // Abandoned new note: drop it entirely.
      get().deleteNote(id);
    }
  },
  resetAll: () => {
    touchedTitles.clear();
    set({
      tasks: [],
      notes: [],
      currentNoteId: null,
      noteFilter: 'all',
      noteMode: 'preview',
      findOpen: false,
      planView: { kind: 'date' },
      reschedulingId: null,
    });
  },
  importData: (data) => {
    const cur = get();
    // Only replace a slice when its array is present, so a partial file cannot
    // silently wipe the other half of the user's data.
    const tasks = Array.isArray(data.tasks) ? sanitizeTasks(data.tasks) : cur.tasks;
    const notes = Array.isArray(data.notes) ? sanitizeNotes(data.notes) : cur.notes;
    const settings = sanitizeSettings(data.settings, cur.settings);
    touchedTitles.clear();
    for (const n of notes) if (n.title.trim()) touchedTitles.add(n.id);
    set({
      tasks,
      notes,
      settings,
      addTag: settings.defaultTag,
      currentNoteId: notes.length ? notes[0].id : null,
      noteFilter: 'all',
      noteMode: 'preview',
      findOpen: false,
      planView: { kind: 'date' },
      reschedulingId: null,
    });
    get().applyTheme();
  },
}));

const PERSIST_DEBOUNCE_MS = 300;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Watches the three persisted slices and writes them back after a short idle
 * delay. Call only after `hydrateFromStorage()` resolves, otherwise the seed
 * state would race the initial load and clobber the real file.
 */
export function setupAutoPersist() {
  let prevSettings = useAppStore.getState().settings;
  let prevTasks = useAppStore.getState().tasks;
  let prevNotes = useAppStore.getState().notes;

  useAppStore.subscribe((state) => {
    if (
      state.settings === prevSettings &&
      state.tasks === prevTasks &&
      state.notes === prevNotes
    ) {
      return;
    }
    prevSettings = state.settings;
    prevTasks = state.tasks;
    prevNotes = state.notes;

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      void useAppStore.getState().persistNow();
    }, PERSIST_DEBOUNCE_MS);
  });
}

/** Flush any pending debounced write immediately (e.g. on window close). */
export function flushPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
    void useAppStore.getState().persistNow();
  }
}
