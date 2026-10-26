import { isTauriRuntime } from './storage';

export const IMAGE_REFERENCE = /^images\/[a-f0-9]{64}\.(png|jpg|gif|webp)$/;
const MAX_BYTES = 10 * 1024 * 1024;

function imageFormat(bytes: Uint8Array): string {
  const starts = (...signature: number[]) => signature.every((b, i) => bytes[i] === b);
  if (starts(137, 80, 78, 71, 13, 10, 26, 10)) return 'png';
  if (starts(255, 216, 255)) return 'jpg';
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (['GIF87a', 'GIF89a'].includes(ascii(0, 6))) return 'gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  throw new Error('仅支持 PNG、JPEG、GIF 和 WebP 图片');
}

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('daynote-images', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function localImage(path: string, bytes?: Uint8Array): Promise<Uint8Array> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('images', bytes ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('images');
      const request = bytes ? store.put(bytes, path) : store.get(path);
      transaction.oncomplete = () => {
        const result = bytes ?? request.result;
        if (result) resolve(result);
        else reject(new Error('图片文件不存在'));
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('图片存储失败'));
    });
  } finally {
    db.close();
  }
}

export async function saveNoteImage(file: Blob): Promise<string> {
  if (!file.size || file.size > MAX_BYTES) throw new Error('图片大小需在 10 MB 以内');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = imageFormat(bytes);
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string>('save_image', { bytes: Array.from(bytes) });
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  const path = `images/${hash}.${extension}`;
  await localImage(path, bytes);
  return path;
}

/** The caller owns the URL and must revoke it when its preview is disposed. */
export async function loadNoteImage(path: string): Promise<string> {
  if (!IMAGE_REFERENCE.test(path)) throw new Error('无效的图片引用');
  let bytes: Uint8Array;
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    bytes = new Uint8Array(await invoke<number[]>('read_image', { path }));
  } else {
    bytes = await localImage(path);
  }
  const format = imageFormat(bytes);
  return URL.createObjectURL(new Blob([bytes], { type: `image/${format === 'jpg' ? 'jpeg' : format}` }));
}
