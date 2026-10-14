import { describe, expect, it } from 'vitest';
import { addDays, fmt, today } from './date';
import { computeChart, computeLogGroups, computeStats, computeTagEntries, getRange } from './stats';
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
  return { id: seq, title: `n${seq}`, content: '', tag: '工作', createdAt: iso, updatedAt: iso, ...partial };
}

describe('getRange', () => {
  it('today is a single day', () => {
    const r = getRange('today');
    expect(fmt(r.start)).toBe(fmt(today()));
    expect(fmt(r.end)).toBe(fmt(today()));
  });

  it('lastweek is the 7 days before this week', () => {
    const r = getRange('lastweek');
    expect(Math.round((r.end.getTime() - r.start.getTime()) / 86400000)).toBe(6);
    expect(fmt(addDays(r.end, 1))).toBe(fmt(getRange('week').start));
  });

  it('lastmonth ends on the last day of the previous month', () => {
    const r = getRange('lastmonth');
    const t = today();
    expect(fmt(r.end)).toBe(fmt(new Date(t.getFullYear(), t.getMonth(), 0)));
    expect(r.start.getDate()).toBe(1);
    expect(r.start.getMonth()).toBe(r.end.getMonth());
  });
});

describe('computeStats', () => {
  it('computes completion rate within an explicit range', () => {
    const start = new Date(2026, 2, 1);
    const end = new Date(2026, 2, 31);
    const r = { start, end };
    const tasks = [
      task({ date: '2026-03-10', done: true, doneAt: '2026-03-10T10:00:00.000Z' }),
      task({ date: '2026-03-11', done: false }),
      task({ date: '2026-03-12', done: true, doneAt: '2026-03-12T10:00:00.000Z' }),
      task({ date: null }),
    ];
    const s = computeStats(tasks, [], r);
    expect(s.total).toBe(3);
    expect(s.doneN).toBe(2);
    expect(s.rate).toBe(67);
    expect(s.unscheduledCount).toBe(1);
  });

  it('counts notes created in range', () => {
    const r = { start: new Date(2026, 2, 1), end: new Date(2026, 2, 31) };
    const s = computeStats([], [note({ createdAt: '2026-03-15T00:00:00.000Z' })], r);
    expect(s.notesNew).toBe(1);
  });
});

describe('computeChart', () => {
  it('expands a single day to its calendar week', () => {
    const d = new Date(2026, 2, 18); // Wednesday
    const chart = computeChart({ start: d, end: d }, []);
    expect(chart.single).toBe(true);
    expect(chart.buckets).toHaveLength(7);
    expect(chart.buckets.filter((b) => b.selected)).toHaveLength(1);
  });

  it('buckets completed tasks per day', () => {
    const start = new Date(2026, 2, 16);
    const end = new Date(2026, 2, 22);
    const done = task({ done: true, doneAt: '2026-03-18T09:00:00.000Z' });
    const chart = computeChart({ start, end }, [done]);
    const bucket = chart.buckets.find((b) => b.ds === '2026-03-18');
    expect(bucket?.value).toBe(1);
    expect(chart.max).toBe(1);
  });
});

describe('computeTagEntries', () => {
  it('counts per tag, most frequent first', () => {
    const out = computeTagEntries([
      task({ tag: '工作' }),
      task({ tag: '工作' }),
      task({ tag: '学习' }),
    ]);
    expect(out[0]).toEqual(['工作', 2]);
  });
});

describe('computeLogGroups', () => {
  it('groups by completion day, newest day first', () => {
    const out = computeLogGroups([
      task({ doneAt: '2026-03-17T09:00:00.000Z' }),
      task({ doneAt: '2026-03-18T09:00:00.000Z' }),
      task({ doneAt: '2026-03-18T11:00:00.000Z' }),
    ]);
    expect(out.map((g) => g.ds)).toEqual(['2026-03-18', '2026-03-17']);
    expect(out[0].items).toHaveLength(2);
  });
});
