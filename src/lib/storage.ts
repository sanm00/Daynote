import type { Note, Settings, Task } from '@/types';
import { LOCAL_KEY } from './constants';

export interface StoreData {
  version: number;
  settings: Settings;
  tasks: Task[];
  notes: Note[];
}

export type StorageKind = 'tauri' | 'local';

/**
 * Persistence boundary. The Tauri implementation writes real files under the
 * resolved storage root (`~/.daynote`, or `<checkout>/data` for debug builds);
 * the browser implementation falls back to `localStorage` so `npm run dev`
 * still works without the native shell.
 */
export interface StorageAdapter {
  readonly kind: StorageKind;
  load(): Promise<StoreData | null>;
  save(data: StoreData): Promise<void>;
  /** Absolute storage root, or `null` when the backend has no filesystem. */
  root(): Promise<string | null>;
}

function createLocalAdapter(): StorageAdapter {
  return {
    kind: 'local',
    async load() {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StoreData;
    },
    async save(data) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    },
    async root() {
      return null;
    },
  };
}

function createTauriAdapter(): StorageAdapter {
  const core = () => import('@tauri-apps/api/core');
  return {
    kind: 'tauri',
    async load() {
      const { invoke } = await core();
      return (await invoke<StoreData | null>('load_data')) ?? null;
    },
    async save(data) {
      const { invoke } = await core();
      await invoke('save_data', { data });
    },
    async root() {
      const { invoke } = await core();
      return invoke<string>('storage_root');
    },
  };
}

/** Tauri injects `__TAURI_INTERNALS__` into the webview; plain browsers do not. */
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function createStorageAdapter(): StorageAdapter {
  return isTauriRuntime() ? createTauriAdapter() : createLocalAdapter();
}

export const storage = createStorageAdapter();
