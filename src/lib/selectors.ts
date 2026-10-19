import type { Note, Priority, Tag, Task } from '@/types';
import { todayStr } from './date';

export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, mid: 1, low: 2 };

/** A task with no schedule (both endpoints empty). */
export const isUnscheduled = (t: Task) => t.beginDate === null;

/** A task that spans more than one day. */
export const isMultiDay = (t: Task) =>
  t.beginDate !== null && t.endDate !== null && t.beginDate !== t.endDate;

/** Whether the task is scheduled to occur on the given `YYYY-MM-DD` day. */
export const occursOn = (t: Task, ds: string) =>
  t.beginDate !== null && t.endDate !== null && ds >= t.beginDate && ds <= t.endDate;

/** Overdue = unfinished and its end day is before today. */
export const isOverdue = (t: Task) =>
  !t.done && t.endDate !== null && t.endDate < todayStr();

/** Unfinished tasks whose end day is before today, most recent first. */
export function getOverdue(tasks: Task[]): Task[] {
  const tStr = todayStr();
  return tasks
    .filter((t) => !t.done && t.endDate !== null && t.endDate < tStr)
    .sort((a, b) => b.endDate!.localeCompare(a.endDate!));
}

/** Unscheduled tasks: unfinished first, then most recently added first. */
export function getUnscheduled(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.beginDate === null)
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
