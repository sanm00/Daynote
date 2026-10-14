import { isTauriRuntime } from './storage';

export interface SaveResult {
  /** Absolute path written by the native dialog, or `null` for a browser download. */
  path: string | null;
  /** True only when the user dismissed the picker. */
  cancelled: boolean;
}

const JSON_FILTER = [{ name: 'JSON', extensions: ['json'] }];

/**
 * Native save panel plus filesystem write. Falls back to an anchor download in
 * the browser, where there is no dialog and no disk access.
 */
export async function saveJsonFile(defaultName: string, text: string): Promise<SaveResult> {
  if (!isTauriRuntime()) {
    downloadFallback(defaultName, text);
    return { path: null, cancelled: false };
  }
  const [{ save }, { writeTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  const path = await save({ defaultPath: defaultName, filters: JSON_FILTER });
  if (!path) return { path: null, cancelled: true };
  await writeTextFile(path, text);
  return { path, cancelled: false };
}

/** Native open panel; returns `null` when the user cancels or picks nothing. */
export async function pickJsonFile(): Promise<File | null> {
  if (!isTauriRuntime()) return null;
  const [{ open }, { readTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  const path = await open({ multiple: false, directory: false, filters: JSON_FILTER });
  if (typeof path !== 'string') return null;
  const name = path.split(/[\\/]/).pop() || 'daynote.json';
  return new File([await readTextFile(path)], name, { type: 'application/json' });
}

function downloadFallback(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
