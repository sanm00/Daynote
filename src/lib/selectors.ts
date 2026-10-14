import type { Note, Priority, Tag, Task } from '@/types';
import { todayStr } from './date';

export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, mid: 1, low: 2 };

/** Unfinished tasks dated strictly before today, most recent first. */
export function getOverdue(tasks: Task[]): Task[] {
  const tStr = todayStr();
  return tasks
    .filter((t) => !t.done && t.date && t.date < tStr)
    .sort((a, b) => b.date!.localeCompare(a.date!));
}

/** Undated tasks: unfinished first, then most recently added first. */
export function getUnscheduled(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.date === null)
    .sort(
      (a, b) => Number(a.done) - Number(b.done) || (b.parsedAt || '').localeCompare(a.parsedAt || ''),
    );
}

export function getPending(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.done);
}

/** Notes for a tag filter (`all` keeps everything), most recently edited first. */
export function getFilteredNotes(notes: Note[], filter: Tag | 'all'): Note[] {
  return notes
    .filter((n) => filter === 'all' || n.tag === filter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
