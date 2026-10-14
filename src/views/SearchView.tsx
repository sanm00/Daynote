import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { dateLabelFor, todayStr } from '@/lib/date';
import { escapeHtml, plainText } from '@/lib/markdown';
import { relTime } from '@/lib/date';
import { toast } from '@/lib/toast';
import type { SearchType } from '@/types';

function highlight(text: string, q: string): string {
  const safe = escapeHtml(text == null ? '' : text);
  if (!q) return safe;
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return safe.replace(re, '<mark class="hit-mark">$1</mark>');
}

function snippetAround(text: string, q: string, radius: number): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  const lc = t.toLowerCase();
  const i = lc.indexOf(q.toLowerCase());
  if (i < 0) return t.slice(0, radius * 2);
  const start = Math.max(0, i - radius);
  const end = Math.min(t.length, i + q.length + radius);
  return (start > 0 ? '…' : '') + t.slice(start, end) + (end < t.length ? '…' : '');
}

const SUGGEST_KW = ['整理', '咖啡', '跑步', '周报', '需求'];

export function SearchView() {
  const tasks = useAppStore((s) => s.tasks);
  const notes = useAppStore((s) => s.notes);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const searchType = useAppStore((s) => s.searchType);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setSearchType = useAppStore((s) => s.setSearchType);
  const closeSearch = useAppStore((s) => s.closeSearch);
  const selectNote = useAppStore((s) => s.selectNote);
  const setNoteFilter = useAppStore((s) => s.setNoteFilter);
  const setPage = useAppStore((s) => s.setPage);
  const goToDate = useAppStore((s) => s.goToDate);
  const setPlanView = useAppStore((s) => s.setPlanView);

  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestion] = useState(
    () => SUGGEST_KW[Math.floor(Math.random() * SUGGEST_KW.length)],
  );

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeSearch]);

  const q = searchQuery.trim();

  const { noteHits, taskHits } = useMemo(() => {
    if (!q) return { noteHits: [], taskHits: [] };
    const lc = q.toLowerCase();
    const nh =
      searchType === 'task'
        ? []
        : notes
            .filter(
              (n) =>
                (n.title || '').toLowerCase().includes(lc) ||
                plainText(n.content).toLowerCase().includes(lc),
            )
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const th =
      searchType === 'note'
        ? []
        : tasks
            .filter((t) => (t.title || '').toLowerCase().includes(lc))
            .sort(
              (a, b) =>
                Number(a.done) - Number(b.done) ||
                String(b.date || '').localeCompare(String(a.date || '')),
            );
    return { noteHits: nh, taskHits: th };
  }, [q, searchType, notes, tasks]);

  const total = noteHits.length + taskHits.length;

  const jumpToNote = (id: number) => {
    selectNote(id);
    setNoteFilter('all');
    setPage('notes');
  };

  const jumpToTask = (id: number) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    if (t.date === null) {
      setPlanView('unscheduled');
      setPage('plan');
      toast('这是一条待排期任务');
    } else {
      goToDate(t.date);
      setPage('plan');
      toast(`已定位到 ${t.date} 的任务`);
    }
    window.setTimeout(() => {
      const row = document.querySelector(`.task[data-id="${id}"]`);
      if (!row) return;
      row.classList.remove('flash');
      void (row as HTMLElement).offsetWidth;
      row.classList.add('flash');
      window.setTimeout(() => row.classList.remove('flash'), 1400);
    }, 60);
  };

  return (
    <section className="page active" id="page-search">
      <div className="search-hero">
        <div className="search-box">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-3.6-3.6" />
          </svg>
          <input
            id="globalSearchInput"
            ref={inputRef}
            placeholder="搜索笔记和待办…"
            autoComplete="off"
            spellCheck={false}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className="search-clear"
            id="globalSearchClear"
            title="清空"
            hidden={!searchQuery}
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        </div>
        <div className="search-tabs" id="globalSearchTabs">
          {(
            [
              ['all', '全部'],
              ['note', '笔记'],
              ['task', '待办'],
            ] as Array<[SearchType, string]>
          ).map(([type, label]) => (
            <button
              key={type}
              className={`search-tab${searchType === type ? ' active' : ''}`}
              data-type={type}
              onClick={() => setSearchType(type)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="search-summary"
        dangerouslySetInnerHTML={{
          __html: q && total
            ? `找到 <b>${total}</b> 条结果 · 笔记 <b>${noteHits.length}</b> · 待办 <b>${taskHits.length}</b>`
            : '',
        }}
      />

      <div className="search-results">
        {!q ? (
          <div className="search-empty">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-3.6-3.6" />
            </svg>
            <div>输入关键词，一次搜遍笔记与待办</div>
            <div className="hint">试试搜「{suggestion}」 · 按 Esc 回到刚才</div>
          </div>
        ) : !total ? (
          <div className="search-empty">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-3.6-3.6" />
            </svg>
            <div>没有找到与「{q}」相关的内容</div>
            <div className="hint">也许它还没被写下，现在记一条正好</div>
          </div>
        ) : (
          <>
            {noteHits.length > 0 && (
              <div className="search-group">
                <div className="search-group-head">
                  笔记 <span className="cnt">{noteHits.length}</span>
                </div>
                {noteHits.map((n) => {
                  const snip = snippetAround(plainText(n.content), q, 36);
                  return (
                    <button
                      key={n.id}
                      className="search-hit"
                      data-kind="note"
                      data-id={n.id}
                      onClick={() => jumpToNote(n.id)}
                    >
                      <span className="hit-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M5 3.5h11l3.5 3.5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
                          <path d="M8 9h8M8 13h8M8 17h5" />
                        </svg>
                      </span>
                      <span className="hit-main">
                        <span
                          className="hit-title"
                          dangerouslySetInnerHTML={{ __html: highlight(n.title || '无标题', q) }}
                        />
                        {snip && (
                          <span
                            className="hit-snippet"
                            dangerouslySetInnerHTML={{ __html: highlight(snip, q) }}
                          />
                        )}
                        <span className="hit-meta">
                          <span className="tag" data-tag={n.tag}>
                            {n.tag}
                          </span>
                          <span>更新于 {relTime(n.updatedAt)}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {taskHits.length > 0 && (
              <div className="search-group">
                <div className="search-group-head">
                  待办 <span className="cnt">{taskHits.length}</span>
                </div>
                {taskHits.map((t) => {
                  const overdue = !t.done && t.date && t.date < todayStr();
                  return (
                    <button
                      key={t.id}
                      className="search-hit"
                      data-kind="task"
                      data-id={t.id}
                      onClick={() => jumpToTask(t.id)}
                    >
                      <span className="hit-icon task">
                        <svg viewBox="0 0 24 24">
                          {t.done ? (
                            <path d="M4 12.5l5 5L20 6.5" />
                          ) : (
                            <>
                              <rect x="4" y="4" width="16" height="16" rx="3" />
                              <path d="M8 12h8" />
                            </>
                          )}
                        </svg>
                      </span>
                      <span className="hit-main">
                        <span
                          className="hit-title"
                          style={
                            t.done
                              ? { color: 'var(--muted-2)', textDecoration: 'line-through' }
                              : undefined
                          }
                          dangerouslySetInnerHTML={{ __html: highlight(t.title, q) }}
                        />
                        <span className="hit-meta">
                          <span className="tag" data-tag={t.tag}>
                            {t.tag}
                          </span>
                          <span className={overdue ? 'overdue-flag-strong' : ''}>
                            {t.date === null ? '待排期' : dateLabelFor(t.date, t.done)}
                          </span>
                          {t.done && <span>· 已完成</span>}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
