import { useAppStore } from '@/store';
import { addDays, fmt, todayStr } from '@/lib/date';
import { occursOn } from '@/lib/selectors';

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
    const dayTasks = tasks.filter((t) => occursOn(t, ds));
    const doneN = dayTasks.filter((t) => t.done).length;
    const undoneN = dayTasks.length - doneN;
    const cls = ['day'];
    if (d.getMonth() !== m) cls.push('other');
    if (ds === tStr) cls.push('today');
    if (ds === selectedDate) cls.push('selected');
    calDays.push(
      <div key={ds} className={cls.join(' ')} data-date={ds} onClick={() => goToDate(ds)}>
        <span>{d.getDate()}</span>
        <span className="day-dots">
          {doneN > 0 && <i className="dot-sm done" />}
          {undoneN > 0 && <i className="dot-sm undone" />}
        </span>
      </div>,
    );
  }

  return (
    <div className="card cal-card">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => setCalMonth(new Date(y, m - 1, 1))}>
          ‹
        </button>
        <div className="cal-title">{`${y}年${m + 1}月`}</div>
        <button className="icon-btn" onClick={() => setCalMonth(new Date(y, m + 1, 1))}>
          ›
        </button>
      </div>
      <div className="cal-week">
        <span>一</span>
        <span>二</span>
        <span>三</span>
        <span>四</span>
        <span>五</span>
        <span>六</span>
        <span>日</span>
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
