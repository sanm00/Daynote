export const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day key, e.g. `2026-09-20`. */
export const fmt = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/** Midnight of the current local day, recomputed on every call. */
export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Today's calendar-day key, recomputed so a long-running session rolls over at midnight. */
export const todayStr = () => fmt(today());

/** Local wall-clock time of an ISO timestamp, e.g. `09:41`. */
export const hmOf = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const dayOf = (iso: string | null) => (iso ? fmt(new Date(iso)) : null);

/** Completion stamp for a task row: `今天 16:00` today, else `2026-10-15 16:00`. */
export const doneAtLabel = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return fmt(d) === todayStr() ? `今天 ${time}` : `${fmt(d)} ${time}`;
};

export function relTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.round((nDate.getTime() - dDate.getTime()) / 86400000);
  if (dayDiff === 0) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (dayDiff === 1) return `昨天 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (dayDiff < 7) return `${dayDiff} 天前`;
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** Nearest upcoming Saturday (today if already weekend). */
export function nearestWeekend(): Date {
  const t = today();
  const dow = (t.getDay() + 6) % 7;
  return addDays(t, (5 - dow + 7) % 7);
}

export function dateLabelFor(ds: string, _done: boolean): string {
  const tStr = todayStr();
  if (ds === tStr) return '今天';
  if (ds === fmt(addDays(today(), 1))) return '明天';
  const d = parseDate(ds);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function dateLabel(ds: string | null): string {
  if (!ds) return '待排期';
  const tStr = todayStr();
  if (ds === tStr) return '今天';
  const d = parseDate(ds);
  if (ds === fmt(addDays(today(), 1))) return '明天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * Label for a task's schedule span: a single day reads `今天`/`明天`/`M月D日`,
 * a multi-day span reads `M月D日–M月D日`. Overdue is signalled by the caller,
 * not baked into the label.
 */
export function dateRangeLabel(begin: string | null, end: string | null): string {
  if (!begin) return '待排期';
  if (end && end !== begin) {
    const b = parseDate(begin);
    const e = parseDate(end);
    return `${b.getMonth() + 1}月${b.getDate()}日–${e.getMonth() + 1}月${e.getDate()}日`;
  }
  return dateLabelFor(begin, false);
}

/** Monday-anchored 7-day window (as day keys) containing `ds`. */
export function weekDays(ds: string): string[] {
  const d = parseDate(ds);
  const mon = addDays(d, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => fmt(addDays(mon, i)));
}

/** First day of the month containing `d` — the anchor for the month calendar. */
export function calAnchorOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Shift a day key by `n` months, clamping the day-of-month. */
export function shiftMonth(ds: string, n: number): string {
  const d = parseDate(ds);
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const dim = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(d.getDate(), dim));
  return fmt(x);
}

/** ISO-8601 week number (1..52/53): the week containing that Thursday. */
export function isoWeekNum(d: Date): number {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (t.getDay() + 6) % 7 + 1; // Mon=1..Sun=7
  t.setDate(t.getDate() - (dow - 4)); // shift to this week's Thursday
  const yearStart = new Date(t.getFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** The ISO year a date belongs to (may differ from calendar year near Jan/Dec edges). */
export function isoYearOf(d: Date): number {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (t.getDay() + 6) % 7 + 1;
  t.setDate(t.getDate() - (dow - 4)); // this week's Thursday decides the ISO year
  return t.getFullYear();
}

/** Mondays of the ISO weeks belonging to `year` (52 or 53 entries). */
export function yearWeekStarts(year: number): Date[] {
  const jan4 = new Date(year, 0, 4); // always in ISO week 1
  const firstMon = addDays(jan4, -((jan4.getDay() + 6) % 7));
  const count = isoWeekNum(new Date(year, 11, 28)); // Dec 28 is always in the last ISO week
  return Array.from({ length: count }, (_, i) => addDays(firstMon, i * 7));
}
