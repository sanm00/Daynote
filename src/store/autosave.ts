import { useAppStore } from './index';

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
