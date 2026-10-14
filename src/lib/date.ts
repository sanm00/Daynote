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

export function dateLabelFor(ds: string, done: boolean): string {
  const tStr = todayStr();
  if (ds === tStr) return '今天';
  if (ds === fmt(addDays(today(), 1))) return '明天';
  const d = parseDate(ds);
  if (ds < tStr && !done) return `逾期 · ${d.getMonth() + 1}月${d.getDate()}日`;
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
