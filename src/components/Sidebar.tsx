import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { todayStr } from '@/lib/date';
import { occursOn } from '@/lib/selectors';
import { QUOTES } from '@/lib/quotes';
import type { Page } from '@/types';

const NAV: Array<{ id: Page; label: string; icon: JSX.Element }> = [
  {
    id: 'plan',
    label: '计划',
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
        <path d="M8 2.5v4M16 2.5v4M3 10h18" />
        <path d="M9 15.5l2 2 4-4.5" />
      </>
    ),
  },
  {
    id: 'notes',
    label: '笔记',
    icon: (
      <>
        <path d="M5 3.5h11l3.5 3.5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </>
    ),
  },
  {
    id: 'review',
    label: '回顾',
    icon: (
      <>
        <path d="M3 21h18" />
        <path d="M6 21V11M11 21V5M16 21v-6M21 21v-9" />
      </>
    ),
  },
  {
    id: 'settings',
    label: '设置',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  },
  {
    id: 'help',
    label: '帮助',
    icon: (
      <>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5" />
        <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

const SIDE_HINTS: Record<'empty' | 'doing' | 'done', string[]> = {
  empty: ['今天还没有安排，不急', '空白的一天也可以很好', '留白也是计划的一部分'],
  doing: ['保持自己的步调', '一件一件来，比较快', '进度不重要，方向才重要', '做一件，就有一件的欢喜'],
  done: ['今天全部完成，真好', '收好这份从容', '剩下的时间留给生活'],
};

const pickFrom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function Sidebar() {
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const openSearch = useAppStore((s) => s.openSearch);
  const tasks = useAppStore((s) => s.tasks);

  const todayTasks = tasks.filter((t) => occursOn(t, todayStr()));
  const doneN = todayTasks.filter((t) => t.done).length;
  const total = todayTasks.length;
  const pct = total ? Math.round((doneN / total) * 100) : 0;
  const key = !total ? 'empty' : doneN === total ? 'done' : 'doing';

  const hintRef = useRef<{ key: string; text: string }>({ key: '', text: '' });
  if (hintRef.current.key !== key) {
    hintRef.current = { key, text: pickFrom(SIDE_HINTS[key]) };
  }

  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(
      () => setQuoteIndex((i) => (i + 1) % QUOTES.length),
      12000,
    );
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo" title="随记 Daynote">
          <svg viewBox="0 0 100 100" width={26} height={26} role="img" aria-label="随记 Daynote 图标"><path d="M61 27C56 24 50 22 43 22H25V78H43C63 78 75 67 75 50C75 48 75 46 74 45" fill="none" stroke="currentColor" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div>
          <div className="brand-name">随记</div>
          <div className="brand-sub">Daynote</div>
        </div>
      </div>

      <button
        className="search-trigger"
        id="searchTrigger"
        title="全局搜索笔记与待办（⌘K）"
        aria-label="全局搜索"
        onClick={openSearch}
      >
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-3.6-3.6" />
        </svg>
        <span>搜索</span>
        <span className="search-hint">⌘K</span>
      </button>

      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item${page === item.id ? ' active' : ''}`}
            data-page={item.id}
            onClick={() => setPage(item.id)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {item.icon}
            </svg>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="side-card">
        <div className="side-head">
          <div className="side-title">今日进度</div>
          <div
            className={`side-ring${total > 0 && doneN === total ? ' full' : ''}`}
            style={{ ['--p' as string]: pct }}
          >
            <i>{total > 0 && doneN === total ? '✓' : `${pct}%`}</i>
          </div>
        </div>
        <div className="side-count">
          <b>{doneN}</b>
          <span className="slash">/</span>
          <span>{total}</span> 件待办已完成
        </div>
        <div className="side-foot">
          <span className="spark">✳</span>
          <span>{hintRef.current.text}</span>
        </div>
      </div>

      <div
        className="quote-card"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="quote-text" dangerouslySetInnerHTML={{ __html: QUOTES[quoteIndex] }} />
        <div className="quote-sign">
          <div className="quote-dots">
            {QUOTES.map((_, i) => (
              <button
                key={i}
                className={`quote-dot${i === quoteIndex ? ' on' : ''}`}
                onClick={() => setQuoteIndex(i)}
              />
            ))}
          </div>
          <span className="glyph">⌁</span>
        </div>
      </div>
    </aside>
  );
}
