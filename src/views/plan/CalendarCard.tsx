import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import type { CalScope } from '@/types';
import {
  addDays,
  fmt,
  isoWeekNum,
  isoYearOf,
  parseDate,
  today,
  todayStr,
  weekDays,
  yearWeekStarts,
} from '@/lib/date';
import { belongsToPlanDay, occursOn } from '@/lib/selectors';
import type { Task } from '@/types';

const SCOPES: { scope: CalScope; label: string }[] = [
  { scope: 'date', label: '日' },
  { scope: 'week', label: '周' },
  { scope: 'month', label: '月' },
];

/** Distinct scheduled tasks overlapping a set of days (multi-day aware). */
function rangeTaskStats(tasks: Task[], days: string[]) {
  const seen = new Set<number>();
  let total = 0;
  let done = 0;
  for(const ds of days){
    for(const t of tasks){
      if(seen.has(t.id) || !occursOn(t, ds)) continue;
      seen.add(t.id);
      total++;
      if(t.done) done++;
    }
  }
  return { total, done };
}

export function CalendarCard() {
  const tasks = useAppStore((s) => s.tasks);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const calScope = useAppStore((s) => s.calScope);
  const goToDate = useAppStore((s) => s.goToDate);
  const goWeek = useAppStore((s) => s.goWeek);
  const goMonth = useAppStore((s) => s.goMonth);
  const setCalScope = useAppStore((s) => s.setCalScope);

  const gridRef = useRef<HTMLDivElement>(null);
  const tStr = todayStr();
  const now = today();
  const selD = parseDate(selectedDate);

  useEffect(() => {
    const grid = gridRef.current;
    if(!grid || calScope === 'date') return;
    const el = grid.querySelector('.day.period.selected');
    if(!el) return;
    const gr = grid.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if(er.top < gr.top || er.bottom > gr.bottom) grid.scrollTop += er.top - gr.top - 8;
  }, [calScope, selectedDate]);

  let title = '';
  let prevLabel = '';
  let nextLabel = '';
  let todayLabel = '';
  let cells: JSX.Element[] = [];

  if(calScope === 'date'){
    const y = selD.getFullYear();
    const m = selD.getMonth();
    title = `${y}年${m + 1}月`;
    prevLabel = '上个月';
    nextLabel = '下个月';
    todayLabel = '今天';
    const first = new Date(y, m, 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    for(let i = 0; i < 42; i++){
      const d = addDays(start, i);
      const ds = fmt(d);
      const dayTasks = tasks.filter((t) => belongsToPlanDay(t, ds));
      const doneN = dayTasks.filter((t) => t.done).length;
      const undoneN = dayTasks.length - doneN;
      const dow = ['一', '二', '三', '四', '五', '六', '日'][(d.getDay() + 6) % 7];
      const cls = ['day'];
      if(d.getMonth() !== m) cls.push('other');
      if(ds === tStr) cls.push('today');
      if(ds === selectedDate) cls.push('selected');
      cells.push(
        <button key={ds} type="button" className={cls.join(' ')} data-date={ds}
          aria-label={`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${dow}${ds === tStr ? '，今天' : ''}${dayTasks.length ? `，${dayTasks.length} 项任务` : ''}`}
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
  } else {
    const isMonth = calScope === 'month';
    const year = isMonth ? selD.getFullYear() : isoYearOf(selD);
    title = `${year}年`;
    prevLabel = '上一年';
    nextLabel = '下一年';
    todayLabel = isMonth ? '当月' : '本周';
    if(isMonth){
      const selMon = selD.getMonth();
      cells = Array.from({ length: 12 }, (_, m) => {
        const dim = new Date(year, m + 1, 0).getDate();
        const days = Array.from({ length: dim }, (_, i) => fmt(new Date(year, m, i + 1)));
        const { total, done } = rangeTaskStats(tasks, days);
        const date = fmt(new Date(year, m, 1));
        const isToday = m === now.getMonth() && year === now.getFullYear();
        const sel = m === selMon;
        const cls = ['day', 'period', 'month'];
        if(isToday) cls.push('today');
        if(sel) cls.push('selected');
        return (
          <button key={date} type="button" className={cls.join(' ')} data-date={date}
            aria-label={`${m + 1}月${total ? `，${total} 项任务，完成 ${done}` : '，无安排'}`}
            aria-current={isToday ? 'date' : undefined}
            aria-pressed={sel}
            onClick={() => goMonth(date)}>
            <span className="day-number">{m + 1}</span>
            <span className="day-dots" aria-hidden="true">
              {done > 0 && <i className="dot-sm done" />}
              {total > done && <i className="dot-sm undone" />}
            </span>
          </button>
        );
      });
    } else {
      const weeks = yearWeekStarts(year);
      const selMon = weekDays(selectedDate)[0];
      cells = weeks.map((mon, i) => {
        const date = fmt(mon);
        const days = Array.from({ length: 7 }, (_, c) => fmt(addDays(mon, c)));
        const { total, done } = rangeTaskStats(tasks, days);
        const isToday = days.includes(tStr);
        const sel = date === selMon;
        const cls = ['day', 'period', 'week'];
        if(isToday) cls.push('today');
        if(sel) cls.push('selected');
        return (
          <button key={date} type="button" className={cls.join(' ')} data-date={date}
            aria-label={`第${isoWeekNum(mon)}周${total ? `，${total} 项任务，完成 ${done}` : '，无安排'}`}
            aria-current={isToday ? 'date' : undefined}
            aria-pressed={sel}
            onClick={() => goWeek(date)}>
            <span className="day-number">{i + 1}</span>
            <span className="day-dots" aria-hidden="true">
              {done > 0 && <i className="dot-sm done" />}
              {total > done && <i className="dot-sm undone" />}
            </span>
          </button>
        );
      });
    }
  }

  const shiftPeriod = (dir: number) => {
    if(calScope === 'date'){
      const y = selD.getFullYear();
      const m = selD.getMonth();
      goToDate(fmt(new Date(y, m + dir, Math.min(selD.getDate(), new Date(y, m + dir + 1, 0).getDate()))));
      return;
    }
    const dim = new Date(selD.getFullYear() + dir, selD.getMonth() + 1, 0).getDate();
    const nd = fmt(new Date(selD.getFullYear() + dir, selD.getMonth(), Math.min(selD.getDate(), dim)));
    if(calScope === 'week') goWeek(nd);
    else goMonth(nd);
  };
  const backToToday = () => {
    if(calScope === 'month') goMonth(tStr);
    else if(calScope === 'week') goWeek(tStr);
    else goToDate(tStr);
  };

  return (
    <div className="card cal-card">
      <div className="cal-head">
        <div className="cal-title" aria-live="polite">{title}</div>
        <div className="cal-navigation">
          <button type="button" className="cal-today-btn" onClick={backToToday}>{todayLabel}</button>
          <button type="button" className="icon-btn" aria-label={prevLabel} onClick={() => shiftPeriod(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5" /></svg>
          </button>
          <button type="button" className="icon-btn" aria-label={nextLabel} onClick={() => shiftPeriod(1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 7 5 5-5 5" /></svg>
          </button>
        </div>
      </div>
      <div className="cal-scope" role="group" aria-label="日历视图">
        {SCOPES.map(({ scope, label }) => (
          <button key={scope} type="button" className={`seg-btn${calScope === scope ? ' active' : ''}`}
            data-scope={scope} onClick={() => setCalScope(scope)}>
            {label}
          </button>
        ))}
      </div>
      <div className="cal-week" hidden={calScope !== 'date'}>
        <span>一</span>
        <span>二</span>
        <span>三</span>
        <span>四</span>
        <span>五</span>
        <span className="weekend">六</span>
        <span className="weekend">日</span>
      </div>
      <div ref={gridRef} className={'cal-grid' + (calScope === 'date' ? '' : ' cal-periods ' + (calScope === 'month' ? 'is-month' : 'is-week'))}>
        {cells}
      </div>
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
