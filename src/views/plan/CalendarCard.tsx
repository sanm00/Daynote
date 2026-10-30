import { useAppStore } from '@/store';
import { addDays, fmt, todayStr } from '@/lib/date';
import { belongsToPlanDay } from '@/lib/selectors';

export function CalendarCard() {
  const tasks = useAppStore((s) => s.tasks);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const calMonth = useAppStore((s) => s.calMonth);
  const setCalMonth = useAppStore((s) => s.setCalMonth);
  const goToDate = useAppStore((s) => s.goToDate);

  const tStr = todayStr();
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -offset);
  const calDays: JSX.Element[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const ds = fmt(d);
    const dayTasks = tasks.filter((t) => belongsToPlanDay(t, ds));
    const doneN = dayTasks.filter((t) => t.done).length;
    const undoneN = dayTasks.length - doneN;
    const cls = ['day'];
    if (d.getMonth() !== m) cls.push('other');
    if (ds === tStr) cls.push('today');
    if (ds === selectedDate) cls.push('selected');
    calDays.push(
      <button key={ds} type="button" className={cls.join(' ')} data-date={ds}
        aria-label={`${y === d.getFullYear() ? '' : `${d.getFullYear()}年`}${d.getMonth() + 1}月${d.getDate()}日${ds === tStr ? '，今天' : ''}`}
        aria-current={ds === tStr ? 'date' : undefined}
        aria-pressed={ds === selectedDate}
        onClick={() => goToDate(ds)}>
        <span className="day-number">{d.getDate()}</span>
        <span className="day-dots" aria-hidden="true">
          {doneN > 0 && <i className="dot-sm done" />}
          {undoneN > 0 && <i className="dot-sm undone" />}
        </span>
      </button>,
    );
  }

  return (
    <div className="card cal-card">
      <div className="cal-head">
        <div className="cal-title" aria-live="polite">{`${y}年${m + 1}月`}</div>
        <div className="cal-navigation">
          <button type="button" className="cal-today-btn" onClick={() => goToDate(tStr)}>今天</button>
          <button type="button" className="icon-btn" aria-label="上个月" onClick={() => setCalMonth(new Date(y, m - 1, 1))}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5" /></svg>
          </button>
          <button type="button" className="icon-btn" aria-label="下个月" onClick={() => setCalMonth(new Date(y, m + 1, 1))}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 7 5 5-5 5" /></svg>
          </button>
        </div>
      </div>
      <div className="cal-week">
        <span>一</span>
        <span>二</span>
        <span>三</span>
        <span>四</span>
        <span>五</span>
        <span className="weekend">六</span>
        <span className="weekend">日</span>
      </div>
      <div className="cal-grid">{calDays}</div>
      <div className="cal-legend">
        <span>
          <i className="dot-sm done" />
          已完成
        </span>
        <span>
          <i className="dot-sm undone" />
          未完成
        </span>
      </div>
    </div>
  );
}
