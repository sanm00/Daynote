import type { Priority } from '@/types';
import { nextTag } from '@/lib/tags';
import { addDays, fmt, parseDate, todayStr } from '@/lib/date';
import { sanitizeNotes, sanitizeSettings, sanitizeTasks } from '@/lib/sanitize';
import { storage } from '@/lib/storage';
import { touchedTitles } from './noteTitle';
import type { DataSlice, SliceCreator } from './types';

export const createDataSlice: SliceCreator<DataSlice> = (set, get) => ({
  tasks: [],
  notes: [],
  settings: { theme: 'light', defaultTag: '工作' },

  ready: false,
  storageKind: storage.kind,
  storagePath: null,
  saveState: 'idle',

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
  updateTask: (id, patch) => {
    const title = patch.title?.trim();
    if (patch.title !== undefined && !title) return;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...(title !== undefined ? { title } : {}) } : t)),
    }));
  },
  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  rescheduleTask: (id, range) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, beginDate: range ? range.begin : null, endDate: range ? range.end : null }
          : t,
      ),
      reschedulingId: null,
    })),
  submitQuickAdd: (title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const { addBegin, addEnd, addTag } = get();
    set((s) => ({
      tasks: [
        ...s.tasks,
        {
          id: Math.max(0, ...s.tasks.map((t) => t.id)) + 1,
          title: trimmed,
          tag: addTag,
          prio: 'mid' as Priority,
          beginDate: addBegin || null,
          endDate: addBegin ? addEnd || addBegin : null,
          done: false,
          doneAt: null,
          source: 'quick',
          parsedAt: new Date().toISOString(),
        },
      ],
      addBegin: '',
      addEnd: '',
    }));
  },
  postponeUnfinished: () => {
    const from = get().selectedDate;
    const shift = (ds: string) => fmt(addDays(parseDate(ds), 1));
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.endDate === from && !t.done
          ? { ...t, beginDate: t.beginDate ? shift(t.beginDate) : null, endDate: shift(t.endDate) }
          : t,
      ),
    }));
  },
  moveAllToToday: (ids) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        ids.includes(t.id) ? { ...t, beginDate: todayStr(), endDate: todayStr() } : t,
      ),
    })),

  deleteNote: (id) =>
    set((s) => {
      touchedTitles.delete(id);
      const notes = s.notes.filter((n) => n.id !== id);
      const currentNoteId =
        s.currentNoteId === id ? (notes.length ? notes[0].id : null) : s.currentNoteId;
      const noteDraft = s.noteDraft?.id === id ? null : s.noteDraft;
      return { notes, currentNoteId, noteDraft };
    }),
  resetAll: () => {
    touchedTitles.clear();
    set({
      tasks: [],
      notes: [],
      noteDraft: null,
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
      noteDraft: null,
      currentNoteId: notes.length ? notes[0].id : null,
      noteFilter: 'all',
      noteMode: 'preview',
      findOpen: false,
      planView: { kind: 'date' },
      reschedulingId: null,
    });
    get().applyTheme();
  },
});
