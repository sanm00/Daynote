import { TagName } from '@/components/Tags';
import { useAppStore } from '@/store';
import { dateRangeLabel, hmOf, todayStr } from '@/lib/date';
import { mdLabel, type LogGroup } from '@/lib/stats';
import { toast } from '@/lib/toast';
import type { Task } from '@/types';

interface Props {
  logGroups: LogGroup[];
  remaining: Task[];
  overdueCount: number;
}

export function CompletionLog({ logGroups, remaining, overdueCount }: Props) {
  const tasks = useAppStore((s) => s.tasks);
  const setPage = useAppStore((s) => s.setPage);
  const goToDate = useAppStore((s) => s.goToDate);

  const doneTotal = logGroups.reduce((n, g) => n + g.items.length, 0);
  const tStr = todayStr();

  const locate = (id: number) => {
    const t = tasks.find((x) => x.id === id);
    if (!t || !t.beginDate) return;
    setPage('plan');
    goToDate(t.beginDate);
    toast(`已定位到 ${t.beginDate} 的任务`);
    const start = performance.now();
    const tick = () => {
      const row = document.querySelector<HTMLElement>(`.task[data-id="${id}"]`);
      if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        row.classList.remove('flash');
        void row.offsetWidth;
        row.classList.add('flash');
        window.setTimeout(() => row.classList.remove('flash'), 1400);
        return;
      }
      if (performance.now() - start < 1500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  return (
    <div className="card log-card">
      <div className="card-title-row">
        <div className="card-title">周期盘点</div>
      </div>

      <div className="audit-sec">
        <div className="audit-sec-title">
          已完成 <span>{doneTotal} 项</span>
        </div>
        <div id="logList">
          {logGroups.length ? (
            logGroups.map(({ ds, items }) => (
              <div className="log-group" key={ds}>
                <div className="log-date">
                  {mdLabel(ds)}
                  <span>{items.length} 项</span>
                </div>
                <div className="log-items">
                  {items.map((t) => (
                    <div className="log-item" key={t.id}>
                      <i className="log-dot" />
                      <span className="log-title">{t.title}</span>
                      <span className="tag" data-tag={t.tag}>
                        <TagName id={t.tag} />
                      </span>
                      <span className="sched-label">
                        计划于 {dateRangeLabel(t.beginDate, t.endDate)}
                      </span>
                      <span className="log-time">{hmOf(t.doneAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-tip">
              <svg viewBox="0 0 24 24">
                <path d="M9 11.5l2 2 4-4.5" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              <span>还没有完成记录</span>
            </div>
          )}
        </div>
      </div>

      <div className="audit-sec">
        <div className="audit-sec-title">
          剩余未完成{' '}
          <span>
            {remaining.length} 项{overdueCount ? ` · 含逾期 ${overdueCount}` : ''}
          </span>
        </div>
        <div id="auditTodoList">
          {remaining.length ? (
            <div className="log-items">
              {remaining.map((t) => {
                const late = t.endDate !== null && t.endDate < tStr;
                return (
                  <div
                    className={`log-item todo${late ? ' late' : ''}`}
                    key={t.id}
                    data-id={t.id}
                    onClick={() => locate(t.id)}
                  >
                    <i className={`log-dot ${late ? 'late' : 'open'}`} />
                    <span className="log-title">{t.title}</span>
                    <span className="tag" data-tag={t.tag}>
                      <TagName id={t.tag} />
                    </span>
                    <span className="sched-label">
                      计划于 {dateRangeLabel(t.beginDate, t.endDate)}
                    </span>
                    {late && (
                      <i className="overdue-tag" title="已逾期">
                        逾期
                      </i>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-tip">
              <svg viewBox="0 0 24 24">
                <path d="M9 11.5l2 2 4-4.5" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              <span>周期内任务已全部完成 🎉</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
