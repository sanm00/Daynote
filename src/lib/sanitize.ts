import type { Note, Priority, Settings, Tag, Task } from '@/types';
import { TAG_ORDER } from './tags';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function coerceTag(v: unknown, fallback: Tag = '工作'): Tag {
  return typeof v === 'string' && (TAG_ORDER as string[]).includes(v) ? (v as Tag) : fallback;
}

export function coercePriority(v: unknown): Priority {
  return v === 'high' || v === 'mid' || v === 'low' ? v : 'mid';
}

export function coerceDate(v: unknown): string | null {
  return typeof v === 'string' && DATE_RE.test(v) ? v : null;
}

/** A parseable ISO-ish timestamp, else `null`. */
export function coerceOptionalISO(v: unknown): string | null {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null;
}

/** A parseable timestamp, else `fallback`. */
export function coerceISO(v: unknown, fallback: string): string {
  return coerceOptionalISO(v) ?? fallback;
}

/**
 * Coerce arbitrary imported JSON into well-formed tasks. Rows that are not
 * objects, or that carry no title, are dropped; ids are made positive and
 * unique so the id counters (max + 1) keep working.
 */
export function sanitizeTasks(input: unknown): Task[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<number>();
  const out: Task[] = [];
  let autoId = 1;
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const t = raw as Record<string, unknown>;
    const title = typeof t.title === 'string' ? t.title : '';
    if (!title.trim()) continue;
    let id = typeof t.id === 'number' && Number.isFinite(t.id) ? Math.trunc(t.id) : 0;
    if (id <= 0 || seen.has(id)) {
      while (seen.has(autoId)) autoId += 1;
      id = autoId;
    }
    seen.add(id);
    const done = !!t.done;
    const begin = coerceDate(t.beginDate);
    let end = coerceDate(t.endDate);
    // Keep the schedule invariant: unscheduled has both null; otherwise the end
    // day falls back to the begin day and never precedes it.
    if (begin === null) end = null;
    else if (end === null || end < begin) end = begin;
    out.push({
      id,
      title,
      tag: coerceTag(t.tag),
      prio: coercePriority(t.prio),
      beginDate: begin,
      endDate: end,
      done,
      doneAt: done ? coerceOptionalISO(t.doneAt) : null,
      ...(t.source === 'note' || t.source === 'quick' ? { source: t.source } : {}),
      ...(coerceOptionalISO(t.parsedAt) ? { parsedAt: t.parsedAt as string } : {}),
    });
  }
  return out;
}

/**
 * Coerce arbitrary imported JSON into well-formed notes, dropping objects with
 * neither title nor body and guaranteeing positive unique ids.
 */
export function sanitizeNotes(input: unknown): Note[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<number>();
  const out: Note[] = [];
  const now = new Date().toISOString();
  let autoId = 1;
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const n = raw as Record<string, unknown>;
    const title = typeof n.title === 'string' ? n.title : '';
    const content = typeof n.content === 'string' ? n.content : '';
    if (!title.trim() && !content.trim()) continue;
    let id = typeof n.id === 'number' && Number.isFinite(n.id) ? Math.trunc(n.id) : 0;
    if (id <= 0 || seen.has(id)) {
      while (seen.has(autoId)) autoId += 1;
      id = autoId;
    }
    seen.add(id);
    out.push({
      id,
      title,
      content,
      tag: coerceTag(n.tag),
      createdAt: coerceISO(n.createdAt, now),
      updatedAt: coerceISO(n.updatedAt, now),
    });
  }
  return out;
}

/** Merge imported settings over the current ones, ignoring unknown values. */
export function sanitizeSettings(input: unknown, fallback: Settings): Settings {
  if (!input || typeof input !== 'object') return fallback;
  const s = input as Record<string, unknown>;
  const theme =
    s.theme === 'light' || s.theme === 'dark' || s.theme === 'system' ? s.theme : fallback.theme;
  return { theme, defaultTag: coerceTag(s.defaultTag, fallback.defaultTag) };
}
