import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { plainText } from '@/lib/markdown';
import { toast } from '@/lib/toast';
import { SUGGEST_KEYWORDS } from '@/lib/constants';
import { SearchResults } from './SearchResults';
import type { SearchType } from '@/types';

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
  const resultsRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestion] = useState(
    () => SUGGEST_KEYWORDS[Math.floor(Math.random() * SUGGEST_KEYWORDS.length)],
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
                String(b.beginDate || '').localeCompare(String(a.beginDate || '')),
            );
    return { noteHits: nh, taskHits: th };
  }, [q, searchType, notes, tasks]);

  const total = noteHits.length + taskHits.length;

  useEffect(() => setActiveIndex(-1), [q, searchType, noteHits, taskHits]);

  useEffect(() => {
    const hits = resultsRef.current?.querySelectorAll<HTMLButtonElement>('.search-hit');
    hits?.forEach((hit, index) => hit.classList.toggle('keyboard-active', index === activeIndex));
    if (activeIndex >= 0) hits?.[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const jumpToNote = (id: number) => {
    selectNote(id);
    setNoteFilter('all');
    setPage('notes');
  };

  const jumpToTask = (id: number) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    if (t.beginDate === null) {
      setPlanView('unscheduled');
      setPage('plan');
      toast('这是一条待排期任务');
    } else {
      goToDate(t.beginDate);
      setPage('plan');
      toast(`已定位到 ${t.beginDate} 的任务`);
    }
    window.setTimeout(() => {
      const row = document.querySelector(`.task[data-id="${id}"]`);
      if (!row) return;
      row.classList.remove('flash');
      void (row as HTMLElement).offsetWidth;
      row.classList.add('flash');
      row.scrollIntoView({ block: 'center' });
      window.setTimeout(() => row.classList.remove('flash'), 1400);
    }, 60);
  };

  return (
    <section className="page active" id="page-search">
      <div className="search-navigation">
        <button type="button" className="btn ghost sm" onClick={closeSearch}>‹ 返回</button>
        <span>↑↓ 选择 · Enter 打开 · Esc 返回</span>
      </div>
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
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229 || !total) return;
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((index) => index < 0
                  ? (e.key === 'ArrowDown' ? 0 : total - 1)
                  : (index + (e.key === 'ArrowDown' ? 1 : -1) + total) % total);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                resultsRef.current?.querySelectorAll<HTMLButtonElement>('.search-hit')[Math.max(0, activeIndex)]?.click();
              }
            }}
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

      <div ref={resultsRef} className="search-results-host">
        <SearchResults
          q={q}
          noteHits={noteHits}
          taskHits={taskHits}
          suggestion={suggestion}
          onJumpNote={jumpToNote}
          onJumpTask={jumpToTask}
        />
      </div>
    </section>
  );
}
