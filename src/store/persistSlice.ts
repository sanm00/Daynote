import { generateDemoNotes, generateDemoTasks } from '@/lib/seed';
import { storage, type StoreData } from '@/lib/storage';
import { SCHEMA_VERSION } from '@/lib/constants';
import { isBlankNote, touchedTitles } from './noteTitle';
import type { PersistSlice, SliceCreator } from './types';

export const createPersistSlice: SliceCreator<PersistSlice> = (set, get) => ({
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
});
