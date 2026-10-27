import { useAppStore } from './index';

const PERSIST_DEBOUNCE_MS = 300;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Watches the persisted data slices and writes them back after a short idle
 * delay. Call only after `hydrateFromStorage()` resolves, otherwise the seed
 * state would race the initial load and clobber the real file.
 */
export function setupAutoPersist() {
  let prevTags = useAppStore.getState().tags;
  let prevSettings = useAppStore.getState().settings;
  let prevTasks = useAppStore.getState().tasks;
  let prevNotes = useAppStore.getState().notes;

  return useAppStore.subscribe((state) => {
    if (
      state.tags === prevTags &&
      state.settings === prevSettings &&
      state.tasks === prevTasks &&
      state.notes === prevNotes
    ) {
      return;
    }
    prevTags = state.tags;
    prevSettings = state.settings;
    prevTasks = state.tasks;
    prevNotes = state.notes;

    // Flip the save indicator immediately, not 300ms later.
    useAppStore.setState({ saveState: 'saving' });

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
