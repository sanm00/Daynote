import { parseDate, today, todayStr } from '@/lib/date';
import type { SliceCreator, UiSlice } from './types';

/** Plan page always opens on today, regardless of where the user left it. */
function planTodayState() {
  const t = todayStr();
  const d = today();
  return {
    planView: { kind: 'date' as const },
    selectedDate: t,
    calMonth: new Date(d.getFullYear(), d.getMonth(), 1),
    reschedulingId: null,
    addDate: t,
  };
}

export const createUiSlice: SliceCreator<UiSlice> = (set, get) => ({
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

  setPage: (page) => {
    const s = get();
    if (s.page === 'notes' && page !== 'notes') s.finalizeNote(s.currentNoteId);
    const base = { page, prevPage: page === 'search' ? s.prevPage : s.page };
    set(page === 'plan' ? { ...base, ...planTodayState() } : base);
  },
  openSearch: () => {
    const cur = get().page;
    set({ page: 'search', prevPage: cur === 'search' ? get().prevPage : cur });
  },
  closeSearch: () => {
    const { prevPage } = get();
    const target = prevPage === 'search' ? 'plan' : prevPage;
    set(target === 'plan' ? { page: target, ...planTodayState() } : { page: target });
  },
  requestNewTodo: () =>
    set({
      ...planTodayState(),
      page: 'plan',
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
});
