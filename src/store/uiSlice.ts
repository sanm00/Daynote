import type { Note } from '@/types';
import { parseDate, today, todayStr } from '@/lib/date';
import { deriveTitle, isBlankNote, touchedTitles } from './noteTitle';
import type { SliceCreator, UiSlice } from './types';

/** Ids for brand-new drafts are negative so they never collide with a saved
 * note and stay easy to spot. */
const nextDraftId = (notes: Note[]) => Math.min(0, ...notes.map((n) => n.id)) - 1;

export const createUiSlice: SliceCreator<UiSlice> = (set, get) => ({
  page: 'plan',
  prevPage: 'plan',
  planView: { kind: 'date' },
  selectedDate: todayStr(),
  calMonth: new Date(today().getFullYear(), today().getMonth(), 1),
  reviewRange: 'today',
  chartType: 'bar',
  addBegin: todayStr(),
  addEnd: todayStr(),
  addTag: '工作',
  popMonth: new Date(today().getFullYear(), today().getMonth(), 1),
  reschedulingId: null,
  noteFilter: 'all',
  noteMode: 'preview',
  currentNoteId: null,
  noteDraft: null,
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
    if (s.page === 'notes' && page !== 'notes') s.commitDraft();
    const base = { page, prevPage: page === 'search' ? s.prevPage : s.page };
    set({ ...base, reschedulingId: null });
  },
  openSearch: () => {
    const s = get();
    if (s.page === 'notes') s.commitDraft();
    const cur = s.page;
    set({ page: 'search', prevPage: cur === 'search' ? s.prevPage : cur });
  },
  closeSearch: () => {
    const { prevPage } = get();
    const target = prevPage === 'search' ? 'plan' : prevPage;
    set({ page: target });
  },
  requestNewTodo: () => {
    const s = get();
    if (s.page === 'notes') s.commitDraft();
    set({
      reschedulingId: null,
      page: 'plan',
      newTodoPending: true,
    });
  },
  consumeNewTodo: () => set({ newTodoPending: false }),
  requestNewNote: () => {
    const s = get();
    if (s.page === 'notes') s.commitDraft();
    set({
      page: 'notes',
      noteFilter: 'all',
      newNotePending: true,
    });
  },
  consumeNewNote: () => set({ newNotePending: false }),
  setPlanView: (kind) => set({ planView: { kind }, reschedulingId: null }),
  goToDate: (date, syncAddDate = true) => {
    const d = parseDate(date);
    set((s) => ({
      planView: { kind: 'date' },
      selectedDate: date,
      calMonth: new Date(d.getFullYear(), d.getMonth(), 1),
      reschedulingId: null,
      addBegin: syncAddDate ? date : s.addBegin,
      addEnd: syncAddDate ? date : s.addEnd,
    }));
  },
  setCalMonth: (calMonth) => set({ calMonth }),
  setReviewRange: (reviewRange) => set({ reviewRange }),
  setChartType: (chartType) => set({ chartType }),
  setAddRange: (addBegin, addEnd) => set({ addBegin, addEnd }),
  setAddTag: (addTag) => set({ addTag }),
  setReschedulingId: (reschedulingId) => set({ reschedulingId }),
  setNoteFilter: (noteFilter) => set({ noteFilter }),
  setNoteMode: (noteMode) => set({ noteMode }),
  selectNote: (currentNoteId) => {
    const s = get();
    // Leaving a note saves its pending edits (unless it is the same note).
    if (s.noteDraft && s.noteDraft.id !== currentNoteId) s.commitDraft();
    set({ currentNoteId });
  },
  newNoteDraft: () => {
    const s = get();
    const now = new Date().toISOString();
    const id = nextDraftId(s.notes);
    set({
      noteDraft: {
        id,
        title: '',
        content: '',
        tag: s.settings.defaultTag,
        createdAt: now,
        updatedAt: now,
      },
      currentNoteId: id,
      noteFilter: 'all',
      noteMode: 'edit',
    });
  },
  editDraft: (patch) =>
    set((s) => {
      let draft = s.noteDraft;
      if (!draft || draft.id !== s.currentNoteId) {
        const base = s.notes.find((n) => n.id === s.currentNoteId);
        if (!base) return {};
        draft = { ...base };
      }
      if (patch.title !== undefined) touchedTitles.add(draft.id);
      const next: Note = { ...draft, ...patch, updatedAt: new Date().toISOString() };
      // Until the user touches the title it mirrors the body (first 50 chars).
      if (patch.content !== undefined && !touchedTitles.has(draft.id)) {
        next.title = deriveTitle(next.content);
      }
      return { noteDraft: next };
    }),
  commitDraft: () => {
    const s = get();
    const draft = s.noteDraft;
    if (!draft) return;
    const isNew = draft.id < 0;
    if (isBlankNote(draft)) {
      // Abandoned new note (or a cleared one): drop it.
      set({
        noteDraft: null,
        currentNoteId: isNew ? (s.notes.length ? s.notes[0].id : null) : draft.id,
      });
      return;
    }
    if (isNew) {
      const id = Math.max(0, ...s.notes.map((n) => n.id)) + 1;
      const note: Note = { ...draft, id, updatedAt: new Date().toISOString() };
      set({ notes: [note, ...s.notes], noteDraft: null, currentNoteId: id });
      return;
    }
    const base = s.notes.find((n) => n.id === draft.id);
    if (
      base &&
      base.title === draft.title &&
      base.content === draft.content &&
      base.tag === draft.tag
    ) {
      // Nothing changed: drop the buffer without a redundant write.
      set({ noteDraft: null });
      return;
    }
    set({
      notes: s.notes.map((n) =>
        n.id === draft.id
          ? { ...n, title: draft.title, content: draft.content, tag: draft.tag, updatedAt: draft.updatedAt }
          : n,
      ),
      noteDraft: null,
    });
  },
  discardDraft: () => {
    const s = get();
    const draft = s.noteDraft;
    if (!draft) return;
    const isNew = draft.id < 0;
    set({
      noteDraft: null,
      currentNoteId: isNew ? (s.notes.length ? s.notes[0].id : null) : draft.id,
    });
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchType: (searchType) => set({ searchType }),
  setTheme: (theme) => {
    set((s) => ({ settings: { ...s.settings, theme } }));
    get().applyTheme();
  },
  setDefaultTag: (defaultTag) => {
    if (!get().tags.some(tag => tag.id === defaultTag)) return;
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
