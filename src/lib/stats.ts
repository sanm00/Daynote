import type { Note, ReviewRange, Tag, Task } from '@/types';
import { addDays, dayNames, dayOf, fmt, parseDate, today, todayStr } from './date';
import { occursOn, PRIORITY_WEIGHT } from './selectors';

export interface Range {
  start: Date;
  end: Date;
}

/**
 * Map a review-range key to its concrete start/end dates (inclusive). `week`
 * and `month` cover the full natural period (Mon–Sun, 1st–last day) so upcoming
 * scheduled tasks stay visible; metrics that must not count the future clamp
 * their own end to today (see `computeStats`).
 */
export function getRange(key: ReviewRange): Range {
  const t = new Date(today());
  const dow = (t.getDay() + 6) % 7;
  const mon = addDays(t, -dow);
  switch (key) {
    case 'today':
      return { start: t, end: t };
    case 'yesterday': {
      const d = addDays(t, -1);
      return { start: d, end: d };
    }
    case 'week':
      return { start: mon, end: addDays(mon, 6) };
    case 'lastweek':
      return { start: addDays(mon, -7), end: addDays(mon, -1) };
    case 'month':
      return { start: new Date(t.getFullYear(), t.getMonth(), 1), end: new Date(t.getFullYear(), t.getMonth() + 1, 0) };
    case 'lastmonth':
      return {
        start: new Date(t.getFullYear(), t.getMonth() - 1, 1),
        end: new Date(t.getFullYear(), t.getMonth(), 0),
      };
  }
}

/**
 * The natural preceding period for a review-range key, used as the baseline for
 * the completion-rate delta: the previous day for a single day, the same weekday
 * last week, or the same day last month. Deriving it from the key (not the span
 * length) keeps `week`/`month` partial ranges aligned to their real predecessor
 * instead of shifting an arbitrary number of days. The month day is clamped to
 * the target month's length (e.g. Mar 31 → Feb 28/29).
 */
export function prevRange(r: Range, key: ReviewRange): Range {
  switch (key) {
    case 'today':
    case 'yesterday':
      return { start: addDays(r.start, -1), end: addDays(r.end, -1) };
    case 'week':
    case 'lastweek':
      return { start: addDays(r.start, -7), end: addDays(r.end, -7) };
    case 'month':
    case 'lastmonth': {
      const shift = (d: Date) => {
        const y = d.getFullYear();
        const m = d.getMonth() - 1;
        const last = new Date(y, m + 1, 0).getDate();
        return new Date(y, m, Math.min(d.getDate(), last));
      };
      return { start: shift(r.start), end: shift(r.end) };
    }
  }
}

export function rangeLabel(r: Range): string {
  if (fmt(r.start) === fmt(r.end)) {
    return `${r.start.getFullYear()}年${r.start.getMonth() + 1}月${r.start.getDate()}日 ${dayNames[r.start.getDay()]}`;
  }
  const sameYear = r.start.getFullYear() === r.end.getFullYear();
  const left = `${sameYear ? '' : r.start.getFullYear() + '年'}${r.start.getMonth() + 1}月${r.start.getDate()}日`;
  return `${left} — ${r.end.getMonth() + 1}月${r.end.getDate()}日`;
}

export function mdLabel(ds: string): string {
  const d = parseDate(ds);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${dayNames[d.getDay()]}`;
}

export interface Stats {
  doneTasks: Task[];
  doneN: number;
  unscheduledCount: number;
  total: number;
  rate: number;
  undoneN: number;
  activeDays: number;
  dayCount: number;
  overdueN: number;
  overdueDoneN: number;
  overdueUndoneN: number;
  hasPrev: boolean;
  delta: number;
  notesNew: number;
  notesEdited: number;
}

/** Aggregate completion/overdue/notes metrics for the given date range. The
 * review-range key drives the delta baseline (see `prevRange`). */
export function computeStats(tasks: Task[], notes: Note[], r: Range, key: ReviewRange): Stats {
  const s = fmt(r.start);
  const e = fmt(r.end);
  const unscheduledCount = tasks.filter((t) => t.beginDate === null).length;
  // Completed tasks: by actual completion day (doneAt) within the period.
  const doneTasks = tasks.filter(
    (t) => t.done && t.doneAt !== null && dayOf(t.doneAt)! >= s && dayOf(t.doneAt)! <= e,
  );
  const doneN = doneTasks.length;
  // Planned tasks: a task counts for a period when its schedule span overlaps
  // the period (beginDate <= period end and endDate >= period start), matching
  // the chart's "scheduled" series. Multi-day tasks count on every day they
  // span, so a task running today..tomorrow still counts as planned today.
  const inSpan = (t: Task, rs: string, re: string) =>
    t.beginDate !== null && t.endDate !== null && t.beginDate <= re && t.endDate >= rs;
  const inRange = tasks.filter((t) => inSpan(t, s, e));
  const total = inRange.length;
  const scheduledDoneN = inRange.filter((t) => t.done).length;
  // Rate mixes the two sets on purpose: completions in the period over planned
  // tasks in the period. May exceed 100% when tasks from earlier periods are
  // finished now, and is not clamped.
  const rate = total ? Math.round((doneN / total) * 100) : 0;
  const undoneN = total - scheduledDoneN;
  const activeDays = new Set(doneTasks.map((t) => dayOf(t.doneAt))).size;
  const dayCount = Math.round((r.end.getTime() - r.start.getTime()) / 86400000) + 1;

  const lateDone = (t: Task) => t.done && t.doneAt && t.endDate !== null && dayOf(t.doneAt)! > t.endDate;
  const overdueUndone = inRange.filter((t) => !t.done && t.endDate! < todayStr());
  const overdueDone = inRange.filter(lateDone);
  const overdueN = overdueUndone.length + overdueDone.length;

  const prev = prevRange(r, key);
  const ps = fmt(prev.start);
  const pe = fmt(prev.end);
  const prevPlannedN = tasks.filter(
    (t) => inSpan(t, ps, pe),
  ).length;
  const prevDoneN = tasks.filter(
    (t) => t.done && t.doneAt !== null && dayOf(t.doneAt)! >= ps && dayOf(t.doneAt)! <= pe,
  ).length;
  const hasPrev = prevPlannedN > 0;
  const prevRate = hasPrev ? Math.round((prevDoneN / prevPlannedN) * 100) : 0;
  const delta = rate - prevRate;

  const inDay = (ds: string) => ds >= s && ds <= e;
  const notesNew = notes.filter((n) => inDay(fmt(new Date(n.createdAt)))).length;
  const notesEdited = notes.filter((n) => {
    const c = fmt(new Date(n.createdAt));
    const u = fmt(new Date(n.updatedAt));
    return u >= s && u <= e && c !== u;
  }).length;

  return {
    doneTasks,
    doneN,
    unscheduledCount,
    total,
    rate,
    undoneN,
    activeDays,
    dayCount,
    overdueN,
    overdueDoneN: overdueDone.length,
    overdueUndoneN: overdueUndone.length,
    hasPrev,
    delta,
    notesNew,
    notesEdited,
  };
}

export interface Bucket {
  ds: string;
  label: string;
  /** Tasks completed on this day (by `doneAt`). */
  value: number;
  /** Tasks whose schedule span overlaps this day (`beginDate <= day <= endDate`). */
  scheduled: number;
  weekend: boolean;
  today: boolean;
}

export interface Chart {
  buckets: Bucket[];
  max: number;
}

/**
 * Per-day buckets for the selected range: completions (`value`, by `doneAt`)
 * alongside scheduled tasks overlapping the day (`scheduled`). The chart spans
 * exactly the range — a single day yields a single bucket.
 */
export function computeChart(r: Range, tasks: Task[]): Chart {
  const days: Date[] = [];
  for (let d = new Date(r.start); d <= r.end; d = addDays(d, 1)) days.push(new Date(d));
  const buckets: Bucket[] = days.map((d) => {
    const ds = fmt(d);
    return {
      ds,
      label: `${d.getDate()}`,
      value: tasks.filter((t) => t.done && dayOf(t.doneAt) === ds).length,
      scheduled: tasks.filter((t) => occursOn(t, ds)).length,
      weekend: d.getDay() === 0 || d.getDay() === 6,
      today: ds === todayStr(),
    };
  });
  return {
    buckets,
    max: Math.max(1, ...buckets.map((b) => Math.max(b.value, b.scheduled))),
  };
}

export type TagEntry = [Tag, number];

/** Completed-task counts per tag, most frequent first. */
export function computeTagEntries(doneTasks: Task[]): TagEntry[] {
  const counts = new Map<Tag, number>();
  doneTasks.forEach((t) => counts.set(t.tag, (counts.get(t.tag) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export interface LogGroup {
  ds: string;
  items: Task[];
}

/** Completed tasks grouped by completion day, newest day first. */
export function computeLogGroups(doneTasks: Task[]): LogGroup[] {
  const byDate = new Map<string, Task[]>();
  doneTasks.forEach((t) => {
    const d = dayOf(t.doneAt)!;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(t);
  });
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([ds, items]) => ({
      ds,
      items: items.sort((a, b) => (a.doneAt || '').localeCompare(b.doneAt || '')),
    }));
}

/**
 * Unfinished tasks whose schedule span overlaps the range, ordered overdue-first
 * then by due date, then by priority. Kept flat (no date grouping).
 */
export function computeRemaining(tasks: Task[], r: Range): Task[] {
  const s = fmt(r.start);
  const e = fmt(r.end);
  const tStr = todayStr();
  return tasks
    .filter(
      (t) =>
        !t.done &&
        t.beginDate !== null &&
        t.endDate !== null &&
        t.beginDate <= e &&
        t.endDate >= s,
    )
    .sort((a, b) => {
      const la = a.endDate! < tStr;
      const lb = b.endDate! < tStr;
      if (la !== lb) return la ? -1 : 1;
      return a.endDate!.localeCompare(b.endDate!) || PRIORITY_WEIGHT[a.prio] - PRIORITY_WEIGHT[b.prio];
    });
}

/** Count of overdue tasks among the given list. */
export function countOverdue(tasks: Task[]): number {
  const tStr = todayStr();
  return tasks.filter((t) => !t.done && t.endDate !== null && t.endDate < tStr).length;
}
