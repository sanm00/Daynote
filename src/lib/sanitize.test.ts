import { describe, expect, it } from 'vitest';
import { coerceDate, coerceTag, sanitizeNotes, sanitizeSettings, sanitizeTasks } from './sanitize';

describe('coerceTag', () => {
  it('keeps known tags and falls back otherwise', () => {
    expect(coerceTag('学习')).toBe('学习');
    expect(coerceTag('未知')).toBe('工作');
    expect(coerceTag(42, '健康')).toBe('健康');
  });
});

describe('coerceDate', () => {
  it('accepts YYYY-MM-DD only', () => {
    expect(coerceDate('2024-05-06')).toBe('2024-05-06');
    expect(coerceDate('2024-5-6')).toBeNull();
    expect(coerceDate(null)).toBeNull();
  });
});

describe('sanitizeTasks', () => {
  it('drops rows without a title', () => {
    const out = sanitizeTasks([{ title: 'ok' }, { title: '   ' }, { nope: true }, null]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('ok');
  });

  it('makes ids positive and unique', () => {
    const out = sanitizeTasks([
      { id: -3, title: 'a' },
      { id: 0, title: 'b' },
      { id: 5, title: 'c' },
      { id: 5, title: 'd' },
    ]);
    const ids = out.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id > 0)).toBe(true);
  });

  it('returns [] for non-arrays', () => {
    expect(sanitizeTasks({ not: 'an array' })).toEqual([]);
  });

  it('normalizes the schedule range invariant', () => {
    const [single, multi, reversed, unscheduled] = sanitizeTasks([
      { title: 'a', beginDate: '2026-05-06' },
      { title: 'b', beginDate: '2026-05-06', endDate: '2026-05-09' },
      { title: 'c', beginDate: '2026-05-09', endDate: '2026-05-06' },
      { title: 'd' },
    ]);
    expect([single.beginDate, single.endDate]).toEqual(['2026-05-06', '2026-05-06']);
    expect([multi.beginDate, multi.endDate]).toEqual(['2026-05-06', '2026-05-09']);
    expect([reversed.beginDate, reversed.endDate]).toEqual(['2026-05-09', '2026-05-09']);
    expect([unscheduled.beginDate, unscheduled.endDate]).toEqual([null, null]);
  });
});

describe('sanitizeNotes', () => {
  it('keeps notes with either title or body', () => {
    const out = sanitizeNotes([{ title: 't' }, { content: 'body only' }, { title: '', content: '' }]);
    expect(out).toHaveLength(2);
  });
});

describe('sanitizeSettings', () => {
  it('merges known values over the fallback', () => {
    const fallback = { theme: 'light' as const, palette: 'morandi' as const, defaultTag: '工作' as const };
    expect(sanitizeSettings({ theme: 'dark' }, fallback)).toEqual({
      theme: 'dark', palette: 'morandi',
      defaultTag: '工作',
    });
    expect(sanitizeSettings({ theme: 'nope', defaultTag: '学习' }, fallback)).toEqual({
      theme: 'light', palette: 'morandi',
      defaultTag: '学习',
    });
    expect(sanitizeSettings('garbage', fallback)).toEqual(fallback);
  });
});

it('accepts known palettes and preserves the current palette for older or invalid imports', () => {
  const fallback = { theme: 'light', palette: 'morandi', defaultTag: '工作' } as const;
  expect(sanitizeSettings({ palette: 'warm' }, fallback).palette).toBe('warm');
  expect(sanitizeSettings({ palette: 'unknown' }, fallback).palette).toBe('morandi');
  expect(sanitizeSettings({ theme: 'dark' }, fallback).palette).toBe('morandi');
});
