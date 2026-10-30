import type { Note, Priority, Tag, Task } from '@/types';
import { dayOf, todayStr } from './date';

export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, mid: 1, low: 2 };

/** A task with no schedule (both endpoints empty). */
export const isUnscheduled = (t: Task) => t.beginDate === null;

/** A task that spans more than one day. */
export const isMultiDay = (t: Task) =>
  t.beginDate !== null && t.endDate !== null && t.beginDate !== t.endDate;

/** Whether the task is scheduled to occur on the given `YYYY-MM-DD` day. */
export const occursOn = (t: Task, ds: string) =>
  t.beginDate !== null && t.endDate !== null && ds >= t.beginDate && ds <= t.endDate;

/** Completed tasks belong to their actual completion day; pending tasks keep their schedule. */
export const belongsToPlanDay = (t: Task, ds: string) =>
  t.done ? dayOf(t.doneAt) === ds : occursOn(t, ds);

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

/** A new (unsaved) note draft carries a negative id so it never collides with
 * a committed note. */
export const isNewDraft = (draft: Note) => draft.id < 0;

/** Whether the draft carries edits worth writing back. A brand-new draft is
 * always unsaved until committed; an existing one is dirty once it diverges
 * from the committed note. */
export function isDraftDirty(draft: Note, notes: Note[]): boolean {
  if (isNewDraft(draft)) return true;
  const base = notes.find((n) => n.id === draft.id);
  if (!base) return true;
  return (
    draft.title !== base.title || draft.content !== base.content || draft.tag !== base.tag
  );
}

/** Notes for the sidebar: the in-memory draft (if any) replaces the committed
 * note it edits, and a brand-new draft is prepended so it shows up immediately. */
export function withDraft(notes: Note[], draft: Note | null): Note[] {
  if (!draft) return notes;
  if (isNewDraft(draft)) return [draft, ...notes];
  return notes.map((n) => (n.id === draft.id ? draft : n));
}
