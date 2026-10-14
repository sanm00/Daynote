import { escapeHtml } from '@/lib/markdown';

export function highlight(text: string, q: string): string {
  const safe = escapeHtml(text == null ? '' : text);
  if (!q) return safe;
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return safe.replace(re, '<mark class="hit-mark">$1</mark>');
}

export function snippetAround(text: string, q: string, radius: number): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  const lc = t.toLowerCase();
  const i = lc.indexOf(q.toLowerCase());
  if (i < 0) return t.slice(0, radius * 2);
  const start = Math.max(0, i - radius);
  const end = Math.min(t.length, i + q.length + radius);
  return (start > 0 ? '…' : '') + t.slice(start, end) + (end < t.length ? '…' : '');
}
