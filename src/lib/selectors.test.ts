import { describe, expect, it } from 'vitest';
import { fmt, addDays, today } from './date';
import { getFilteredNotes, getOverdue, getPending, getUnscheduled } from './selectors';
import type { Note, Priority, Task } from '@/types';

let seq = 0;
function task(partial: Partial<Task>): Task {
  seq += 1;
  return {
    id: seq,
    title: `t${seq}`,
    tag: '工作',
    prio: 'mid' as Priority,
    date: null,
    done: false,
    doneAt: null,
    ...partial,
  };
}

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
  it('keeps only unfinished tasks dated before today', () => {
    const yesterday = fmt(addDays(today(), -1));
    const tomorrow = fmt(addDays(today(), 1));
    const out = getOverdue([
      task({ date: yesterday }),
      task({ date: tomorrow }),
      task({ date: yesterday, done: true }),
      task({ date: null }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe(yesterday);
  });

  it('sorts most recent date first', () => {
    const out = getOverdue([
      task({ date: fmt(addDays(today(), -5)) }),
      task({ date: fmt(addDays(today(), -1)) }),
      task({ date: fmt(addDays(today(), -3)) }),
    ]);
    expect(out.map((t) => t.date)).toEqual([
      fmt(addDays(today(), -1)),
      fmt(addDays(today(), -3)),
      fmt(addDays(today(), -5)),
    ]);
  });
});

describe('getUnscheduled', () => {
  it('keeps undated tasks, unfinished first', () => {
    const out = getUnscheduled([
      task({ date: null, done: true }),
      task({ date: null, done: false }),
      task({ date: fmt(today()) }),
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
