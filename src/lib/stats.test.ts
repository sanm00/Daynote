import { describe, expect, it } from 'vitest';
import { addDays, fmt, today } from './date';
import {
  computeChart,
  computeLogGroups,
  computeRemaining,
  computeStats,
  computeTagEntries,
  countOverdue,
  getRange,
  prevRange,
} from './stats';
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

  it('week covers Monday through Sunday', () => {
    const r = getRange('week');
    expect(r.start.getDay()).toBe(1);
    expect(r.end.getDay()).toBe(0);
    expect(Math.round((r.end.getTime() - r.start.getTime()) / 86400000)).toBe(6);
  });

  it('month covers the whole calendar month', () => {
    const r = getRange('month');
    const t = today();
    expect(r.start.getDate()).toBe(1);
    expect(fmt(r.end)).toBe(fmt(new Date(t.getFullYear(), t.getMonth() + 1, 0)));
  });
});

describe('prevRange', () => {
  it('shifts a single day back by one day', () => {
    const r = { start: new Date(2026, 9, 29), end: new Date(2026, 9, 29) };
    const p = prevRange(r, 'today');
    expect(fmt(p.start)).toBe('2026-10-28');
    expect(fmt(p.end)).toBe('2026-10-28');
  });

  it('aligns a week range to the same days last week', () => {
    const r = { start: new Date(2026, 9, 26), end: new Date(2026, 9, 29) };
    const p = prevRange(r, 'week');
    expect(fmt(p.start)).toBe('2026-10-19');
    expect(fmt(p.end)).toBe('2026-10-22');
  });

  it('aligns a partial month to the same days last month', () => {
    const r = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 29) };
    const p = prevRange(r, 'month');
    expect(fmt(p.start)).toBe('2026-09-01');
    expect(fmt(p.end)).toBe('2026-09-29');
  });

  it('clamps the month day to the previous month length', () => {
    const r = { start: new Date(2026, 2, 1), end: new Date(2026, 2, 31) };
    const p = prevRange(r, 'month');
    expect(fmt(p.start)).toBe('2026-02-01');
    expect(fmt(p.end)).toBe('2026-02-28');
  });
});

describe('computeStats', () => {
  it('computes completion rate by end day within an explicit range', () => {
    const start = new Date(2026, 2, 1);
    const end = new Date(2026, 2, 31);
    const r = { start, end };
    const tasks = [
      task({ beginDate: '2026-03-10', endDate: '2026-03-10', done: true, doneAt: '2026-03-10T10:00:00.000Z' }),
      task({ beginDate: '2026-03-11', endDate: '2026-03-11', done: false }),
      task({ beginDate: '2026-03-12', endDate: '2026-03-12', done: true, doneAt: '2026-03-12T10:00:00.000Z' }),
      task({ beginDate: null, endDate: null }),
      // spans into the month: belongs here because its end day (03-20) is inside
      task({ beginDate: '2026-02-25', endDate: '2026-03-20', done: false }),
    ];
    const s = computeStats(tasks, [], r, 'month');
    expect(s.total).toBe(4);
    expect(s.doneN).toBe(2);
    expect(s.rate).toBe(50);
    expect(s.unscheduledCount).toBe(1);
  });

  it('counts notes created in range', () => {
    const r = { start: new Date(2026, 2, 1), end: new Date(2026, 2, 31) };
    const s = computeStats([], [note({ createdAt: '2026-03-15T00:00:00.000Z' })], r, 'month');
    expect(s.notesNew).toBe(1);
  });

  it('counts future planned tasks in the total and lists them as remaining', () => {
    const r = { start: today(), end: addDays(today(), 1) };
    const due = task({ beginDate: fmt(today()), endDate: fmt(today()) });
    const upcoming = task({ beginDate: fmt(addDays(today(), 1)), endDate: fmt(addDays(today(), 1)) });
    const s = computeStats([due, upcoming], [], r, 'today');
    expect(s.total).toBe(2);
    expect(s.rate).toBe(0);
    expect(computeRemaining([due, upcoming], r).map((t) => t.endDate)).toEqual([
      fmt(today()),
      fmt(addDays(today(), 1)),
    ]);
  });

  it('derives the rate from completions by day and may exceed 100%', () => {
    const r = { start: today(), end: today() };
    const planned = task({ beginDate: fmt(today()), endDate: fmt(today()) });
    const carried1 = task({ beginDate: fmt(addDays(today(), -1)), endDate: fmt(addDays(today(), -1)), done: true, doneAt: new Date().toISOString() });
    const carried2 = task({ beginDate: fmt(addDays(today(), -1)), endDate: fmt(addDays(today(), -1)), done: true, doneAt: new Date().toISOString() });
    const s = computeStats([planned, carried1, carried2], [], r, 'today');
    expect(s.total).toBe(1);
    expect(s.doneN).toBe(2);
    expect(s.rate).toBe(200);
  });

  it('ignores completions whose day is outside the period', () => {
    const r = { start: today(), end: today() };
    const early = task({ beginDate: fmt(today()), endDate: fmt(today()), done: true, doneAt: `${fmt(addDays(today(), -1))}T12:00:00` });
    const s = computeStats([early], [], r, 'today');
    expect(s.total).toBe(1);
    expect(s.doneN).toBe(0);
    expect(s.rate).toBe(0);
    expect(s.undoneN).toBe(0);
  });

  it('counts a multi-day task as planned on every day it spans', () => {
    const r = { start: today(), end: today() };
    const span = task({
      beginDate: fmt(addDays(today(), -1)),
      endDate: fmt(addDays(today(), 1)),
      done: true,
      doneAt: new Date().toISOString(),
    });
    const s = computeStats([span], [], r, 'today');
    expect(s.total).toBe(1);
    expect(s.doneN).toBe(1);
    expect(s.rate).toBe(100);
  });
});

describe('computeRemaining', () => {
  it('keeps unfinished tasks whose end day is inside the range', () => {
    const start = new Date(2026, 2, 1);
    const end = new Date(2026, 2, 31);
    const tasks = [
      task({ beginDate: '2026-02-20', endDate: '2026-02-28' }), // ends before range
      task({ beginDate: '2026-03-05', endDate: '2026-03-05' }),
      task({ beginDate: '2026-03-10', endDate: '2026-03-20' }),
      task({ beginDate: '2026-03-10', endDate: '2026-03-20', done: true }),
      task({ beginDate: null, endDate: null }),
    ];
    const out = computeRemaining(tasks, { start, end });
    expect(out.map((t) => t.endDate)).toEqual(['2026-03-05', '2026-03-20']);
  });
});

describe('countOverdue', () => {
  it('counts unfinished tasks past their end day', () => {
    const overdue = task({ beginDate: fmt(addDays(today(), -3)), endDate: fmt(addDays(today(), -1)) });
    const span = task({ beginDate: fmt(addDays(today(), -2)), endDate: fmt(addDays(today(), 2)) });
    const done = task({ beginDate: fmt(addDays(today(), -3)), endDate: fmt(addDays(today(), -1)), done: true });
    expect(countOverdue([overdue, span, done])).toBe(1);
  });
});

describe('computeChart', () => {
  it('spans exactly the range (a single day yields one bucket)', () => {
    const d = new Date(2026, 2, 18); // Wednesday
    const chart = computeChart({ start: d, end: d }, []);
    expect(chart.buckets).toHaveLength(1);
    expect(chart.buckets[0].ds).toBe('2026-03-18');
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

  it('counts scheduled tasks for every day their span overlaps', () => {
    const start = new Date(2026, 2, 16);
    const end = new Date(2026, 2, 22);
    const span = task({ beginDate: '2026-03-17', endDate: '2026-03-19' });
    const outside = task({ beginDate: '2026-03-30', endDate: '2026-03-31' });
    const chart = computeChart({ start, end }, [span, outside]);
    const sched = Object.fromEntries(chart.buckets.map((b) => [b.ds, b.scheduled]));
    expect(sched['2026-03-17']).toBe(1);
    expect(sched['2026-03-18']).toBe(1);
    expect(sched['2026-03-19']).toBe(1);
    expect(sched['2026-03-16']).toBe(0);
    expect(sched['2026-03-20']).toBe(0);
    // shared y-axis scale reflects the larger of the two series
    expect(chart.max).toBe(1);
  });

  it('scales both series on one axis', () => {
    const start = new Date(2026, 2, 16);
    const end = new Date(2026, 2, 22);
    const tasks = [
      task({ done: true, doneAt: '2026-03-18T09:00:00.000Z' }),
      task({ beginDate: '2026-03-18', endDate: '2026-03-18' }),
      task({ beginDate: '2026-03-18', endDate: '2026-03-18' }),
    ];
    const chart = computeChart({ start, end }, tasks);
    expect(chart.max).toBe(2);
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
