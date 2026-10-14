import type { Note, ReviewRange, Tag, Task } from '@/types';
import { addDays, dayNames, dayOf, fmt, parseDate, today, todayStr } from './date';

export interface Range {
  start: Date;
  end: Date;
}

/** Map a review-range key to its concrete start/end dates (inclusive). */
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
      return { start: mon, end: t };
    case 'lastweek':
      return { start: addDays(mon, -7), end: addDays(mon, -1) };
    case 'month':
      return { start: new Date(t.getFullYear(), t.getMonth(), 1), end: t };
    case 'lastmonth':
      return {
        start: new Date(t.getFullYear(), t.getMonth() - 1, 1),
        end: new Date(t.getFullYear(), t.getMonth(), 0),
      };
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

/** Aggregate completion/overdue/notes metrics for the given date range. */
export function computeStats(tasks: Task[], notes: Note[], r: Range): Stats {
  const s = fmt(r.start);
  const e = fmt(r.end);
  const unscheduledCount = tasks.filter((t) => t.date === null).length;
  const doneTasks = tasks.filter(
    (t) => t.done && t.doneAt !== null && dayOf(t.doneAt)! >= s && dayOf(t.doneAt)! <= e,
  );
  const doneN = doneTasks.length;
  const inRange = tasks.filter((t) => t.date !== null && t.date! >= s && t.date! <= e);
  const total = inRange.length;
  const scheduledDoneN = inRange.filter((t) => t.done).length;
  const rate = total ? Math.round((scheduledDoneN / total) * 100) : 0;
  const undoneN = total - scheduledDoneN;
  const activeDays = new Set(doneTasks.map((t) => dayOf(t.doneAt))).size;
  const dayCount = Math.round((r.end.getTime() - r.start.getTime()) / 86400000) + 1;

  const lateDone = (t: Task) => t.done && t.doneAt && t.date !== null && dayOf(t.doneAt)! > t.date!;
  const overdueUndone = inRange.filter((t) => !t.done && t.date! < todayStr());
  const overdueDone = inRange.filter(lateDone);
  const overdueN = overdueUndone.length + overdueDone.length;

  const prevStart = addDays(r.start, -dayCount);
  const prevEnd = addDays(r.start, -1);
  const ps = fmt(prevStart);
  const pe = fmt(prevEnd);
  const prevInRange = tasks.filter((t) => t.date !== null && t.date! >= ps && t.date! <= pe);
  const hasPrev = prevInRange.length > 0;
  const prevRate = hasPrev
    ? Math.round((prevInRange.filter((t) => t.done).length / prevInRange.length) * 100)
    : 0;
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
  value: number;
  weekend: boolean;
  today: boolean;
  selected: boolean;
}

export interface Chart {
  single: boolean;
  chartStart: Date;
  chartEnd: Date;
  buckets: Bucket[];
  max: number;
}

/**
 * Daily completion buckets. A single-day range expands to its calendar week so
 * the chart always has a meaningful x-axis; `selected` marks the picked day.
 */
export function computeChart(r: Range, doneTasks: Task[]): Chart {
  const single = fmt(r.start) === fmt(r.end);
  let chartStart = r.start;
  let chartEnd = r.end;
  let selectedDs: string | null = null;
  if (single) {
    const dow = (r.start.getDay() + 6) % 7;
    chartStart = addDays(r.start, -dow);
    chartEnd = addDays(chartStart, 6);
    selectedDs = fmt(r.start);
  }
  const days: Date[] = [];
  for (let d = new Date(chartStart); d <= chartEnd; d = addDays(d, 1)) days.push(new Date(d));
  const buckets: Bucket[] = days.map((d) => {
    const ds = fmt(d);
    return {
      ds,
      label: `${d.getDate()}`,
      value: doneTasks.filter((t) => dayOf(t.doneAt) === ds).length,
      weekend: d.getDay() === 0 || d.getDay() === 6,
      today: ds === todayStr(),
      selected: ds === selectedDs,
    };
  });
  return {
    single,
    chartStart,
    chartEnd,
    buckets,
    max: Math.max(1, ...buckets.map((b) => b.value)),
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
