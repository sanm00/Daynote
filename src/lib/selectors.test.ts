import { describe, expect, it } from 'vitest';
import { fmt, addDays, today } from './date';
import {
  getFilteredNotes,
  getOverdue,
  getPending,
  getUnscheduled,
  isMultiDay,
  isOverdue,
  isUnscheduled,
  occursOn,
} from './selectors';
import type { Note, Priority, Task } from '@/types';

let seq = 0;
function task(partial: Partial<Task>): Task {
  seq += 1;
  return {
    id: seq,
    title: `t${seq}`,
    tag: '工作',
    prio: 'mid' as Priority,
    beginDate: null,
    endDate: null,
    done: false,
    doneAt: null,
    ...partial,
  };
}

const day = (n: number) => fmt(addDays(today(), n));

function note(partial: Partial<Note>): Note {
  seq += 1;
  const iso = new Date(2026, 0, 1, 0, 0, seq).toISOString();
  return {
    id: seq,
    title: `n${seq}`,
    content: '',
    tag: '工作',
    createdAt: iso,
    updatedAt: iso,
    ...partial,
  };
}

describe('getOverdue', () => {
  it('keeps only unfinished tasks whose end day is before today', () => {
    const yesterday = day(-1);
    const tomorrow = day(1);
    const out = getOverdue([
      task({ beginDate: yesterday, endDate: yesterday }),
      task({ beginDate: tomorrow, endDate: tomorrow }),
      task({ beginDate: yesterday, endDate: yesterday, done: true }),
      task({ beginDate: null, endDate: null }),
      // a span that ends tomorrow is not overdue even though it began before today
      task({ beginDate: day(-2), endDate: tomorrow }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].endDate).toBe(yesterday);
  });

  it('sorts most recent due date first', () => {
    const out = getOverdue([
      task({ beginDate: day(-5), endDate: day(-5) }),
      task({ beginDate: day(-1), endDate: day(-1) }),
      task({ beginDate: day(-3), endDate: day(-3) }),
    ]);
    expect(out.map((t) => t.endDate)).toEqual([day(-1), day(-3), day(-5)]);
  });
});

describe('schedule helpers', () => {
  it('classifies unscheduled, multi-day and overdue', () => {
    expect(isUnscheduled(task({ beginDate: null, endDate: null }))).toBe(true);
    expect(isUnscheduled(task({ beginDate: day(0), endDate: day(0) }))).toBe(false);
    expect(isMultiDay(task({ beginDate: day(0), endDate: day(2) }))).toBe(true);
    expect(isMultiDay(task({ beginDate: day(0), endDate: day(0) }))).toBe(false);
    expect(isOverdue(task({ beginDate: day(-2), endDate: day(-1) }))).toBe(true);
    expect(isOverdue(task({ beginDate: day(-2), endDate: day(-1), done: true }))).toBe(false);
  });

  it('occursOn matches every day inside the span', () => {
    const t = task({ beginDate: day(0), endDate: day(2) });
    expect(occursOn(t, day(-1))).toBe(false);
    expect(occursOn(t, day(0))).toBe(true);
    expect(occursOn(t, day(1))).toBe(true);
    expect(occursOn(t, day(2))).toBe(true);
    expect(occursOn(t, day(3))).toBe(false);
    expect(occursOn(task({ beginDate: null, endDate: null }), day(0))).toBe(false);
  });
});

describe('getUnscheduled', () => {
  it('keeps undated tasks, unfinished first', () => {
    const out = getUnscheduled([
      task({ beginDate: null, endDate: null, done: true }),
      task({ beginDate: null, endDate: null, done: false }),
      task({ beginDate: day(0), endDate: day(0) }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].done).toBe(false);
  });
});

describe('getPending', () => {
  it('drops completed tasks', () => {
    const out = getPending([task({ done: true }), task({ done: false }), task({ done: false })]);
    expect(out).toHaveLength(2);
  });
});

describe('getFilteredNotes', () => {
  it('filters by tag and sorts by updatedAt desc', () => {
    const older = note({ tag: '工作', updatedAt: '2026-01-01T00:00:00.000Z' });
    const newer = note({ tag: '工作', updatedAt: '2026-02-01T00:00:00.000Z' });
    const other = note({ tag: '学习', updatedAt: '2026-03-01T00:00:00.000Z' });
    const out = getFilteredNotes([older, newer, other], '工作');
    expect(out.map((n) => n.id)).toEqual([newer.id, older.id]);
  });

  it('returns everything for the `all` filter', () => {
    const out = getFilteredNotes([note({ tag: '工作' }), note({ tag: '学习' })], 'all');
    expect(out).toHaveLength(2);
  });
});
