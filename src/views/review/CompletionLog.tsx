import { useAppStore } from '@/store';
import { hmOf, parseDate, todayStr } from '@/lib/date';
import { dayNames } from '@/lib/date';
import { PRIORITY_WEIGHT as pw } from '@/lib/selectors';
import { mdLabel, type LogGroup, type RemainGroup } from '@/lib/stats';
import { toast } from '@/lib/toast';

interface Props {
  logGroups: LogGroup[];
  remainGroups: RemainGroup[];
  overdueCount: number;
}

export function CompletionLog({ logGroups, remainGroups, overdueCount }: Props) {
  const tasks = useAppStore((s) => s.tasks);
  const setPage = useAppStore((s) => s.setPage);
  const goToDate = useAppStore((s) => s.goToDate);

  const doneTotal = logGroups.reduce((n, g) => n + g.items.length, 0);
  const todoTotal = remainGroups.reduce((n, g) => n + g.items.length, 0);
  const tStr = todayStr();

  const locate = (id: number) => {
    const t = tasks.find((x) => x.id === id);
    if (!t || !t.date) return;
    setPage('plan');
    goToDate(t.date);
    toast(`已定位到 ${t.date} 的任务`);
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

  const labelFor = (ds: string) => {
    const d = parseDate(ds);
    const wd = dayNames[d.getDay()];
    return ds === tStr ? `今天 ${wd}` : `${d.getMonth() + 1}月${d.getDate()}日 ${wd}`;
  };

  const sortedRemain = (items: import('@/types').Task[]) =>
    items.slice().sort((a, b) => pw[a.prio] - pw[b.prio]);

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
                        {t.tag}
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
            {todoTotal} 项{overdueCount ? ` · 含逾期 ${overdueCount}` : ''}
          </span>
        </div>
        <div id="auditTodoList">
          {remainGroups.length ? (
            remainGroups.map(({ ds, late, items }) => (
              <div className="log-group" key={ds}>
                <div className="log-date">
                  {labelFor(ds)}
                  <span>{items.length} 项</span>
                  {late && <i className="audit-late-tag">已逾期</i>}
                </div>
                <div className="log-items">
                  {sortedRemain(items).map((t) => (
                    <div
                      className={`log-item todo${late ? ' late' : ''}`}
                      key={t.id}
                      data-id={t.id}
                      onClick={() => locate(t.id)}
                    >
                      <i className={`log-dot ${late ? 'late' : 'open'}`} />
                      <span className="log-title">{t.title}</span>
                      <span className="tag" data-tag={t.tag}>
                        {t.tag}
                      </span>
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
              <span>周期内任务已全部完成 🎉</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
