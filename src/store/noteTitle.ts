import type { Note } from '@/types';
import { plainText } from '@/lib/markdown';

/**
 * Ids of notes whose title the user has touched at least once. A note not in
 * this set keeps its empty title mirrored from the body (first 50 chars).
 */
export const touchedTitles = new Set<number>();

/** First 50 characters of the note body, used as a fallback title. */
export function deriveTitle(content: string): string {
  return plainText(content).slice(0, 50).trim();
}

export function isBlankNote(note: Note): boolean {
  return !note.title.trim() && !note.content.trim();
}
