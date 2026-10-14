import { dateLabelFor, relTime, todayStr } from '@/lib/date';
import { plainText } from '@/lib/markdown';
import type { Note, Task } from '@/types';
import { highlight, snippetAround } from '@/lib/search';

interface Props {
  q: string;
  noteHits: Note[];
  taskHits: Task[];
  suggestion: string;
  onJumpNote: (id: number) => void;
  onJumpTask: (id: number) => void;
}

const SEARCH_ICON = (
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-3.6-3.6" />
  </>
);

export function SearchResults({ q, noteHits, taskHits, suggestion, onJumpNote, onJumpTask }: Props) {
  const total = noteHits.length + taskHits.length;
  return (
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
                      onClick={() => onJumpNote(n.id)}
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
                      onClick={() => onJumpTask(t.id)}
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
  );
}
