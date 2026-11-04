import type { Note, Priority, Tag, Task } from '@/types';
import { dayOf, todayStr } from './date';

export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, mid: 1, low: 2 };

/** A task with no schedule (both endpoints empty). */
export const isUnscheduled = (t: Task) => t.beginDate === null;

/** Raw schedule membership: the task's span covers the `YYYY-MM-DD` day. */
export const occursOn = (t: Task, ds: string) =>
  t.beginDate !== null && t.endDate !== null && ds >= t.beginDate && ds <= t.endDate;

/** Raw schedule overlap: the task's span intersects the inclusive range [rs, re]. */
export const spansRange = (t: Task, rs: string, re: string) =>
  t.beginDate !== null && t.endDate !== null && t.beginDate <= re && t.endDate >= rs;

/**
 * The day a *completed* task is attributed to: its completion day, clamped into
 * the schedule by taking the earlier of the two (`min(doneAt day, endDate)`), so
 * finishing early still counts as planned for that day and never counts beyond
 * the due date. Returns `null` for unfinished or unstamped tasks, which keep
 * their schedule span (they legitimately occupy every day they span).
 */
export const plannedDay = (t: Task) => {
  if (!t.done) return null;
  const done = dayOf(t.doneAt);
  if (done === null) return null;
  if (t.endDate === null) return done;
  return done < t.endDate ? done : t.endDate;
};

/**
 * Whether the task belongs to the plan day `ds`: a completed task counts once on
 * its attributed day (`plannedDay`), an unfinished one across its whole span.
 * This is the single day-attribution rule shared by the plan page and stats.
 */
export const belongsToPlanDay = (t: Task, ds: string) => {
  const pd = plannedDay(t);
  return pd !== null ? pd === ds : occursOn(t, ds);
};

/** Whether the task belongs to the inclusive range [rs, re], counted once. */
export const belongsToPlanRange = (t: Task, rs: string, re: string) => {
  const pd = plannedDay(t);
  return pd !== null ? pd >= rs && pd <= re : spansRange(t, rs, re);
};

export interface DayCounts {
  total: number;
  done: number;
}

/** Distinct tasks belonging to [rs, re], split into total / done. */
export function countPlanRange(tasks: Task[], rs: string, re: string): DayCounts {
  let total = 0;
  let done = 0;
  for (const t of tasks) {
    if (!belongsToPlanRange(t, rs, re)) continue;
    total += 1;
    if (t.done) done += 1;
  }
  return { total, done };
}

/** Overdue = unfinished and its end day is before today. */
export const isOverdue = (t: Task) =>
  !t.done && t.endDate !== null && t.endDate < todayStr();

/** Unfinished tasks whose end day is before today, most recent first. */
export function getOverdue(tasks: Task[]): Task[] {
  return tasks.filter(isOverdue).sort((a, b) => b.endDate!.localeCompare(a.endDate!));
}

/** Unscheduled tasks: unfinished first, then most recently added first. */
export function getUnscheduled(tasks: Task[]): Task[] {
  return tasks
    .filter(isUnscheduled)
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
const isNewDraft = (draft: Note) => draft.id < 0;

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
