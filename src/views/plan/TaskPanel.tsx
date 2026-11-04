import { useAppStore } from '@/store';
import { PRIORITY_WEIGHT as pw, getOverdue, getPending, getUnscheduled, belongsToPlanDay, countPlanRange } from '@/lib/selectors';
import {
  calAnchorOf,
  dayNames,
  fmt,
  isoWeekNum,
  isoYearOf,
  parseDate,
  today,
  todayStr,
  weekDays,
} from '@/lib/date';
import { emptyTip, groupedRows, overdueSubtitle, pendingSubtitle, PendingList, RangeList } from './TaskLists';
import type { UseDatePop } from './useDatePop';

interface Props {
  datePop: UseDatePop;
}

export function TaskPanel({ datePop }: Props) {
  const tasks = useAppStore((s) => s.tasks);
  const planView = useAppStore((s) => s.planView);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const goToDate = useAppStore((s) => s.goToDate);
  const moveAllToToday = useAppStore((s) => s.moveAllToToday);

  const tStr = todayStr();
  const overdueList = getOverdue(tasks);
  const unschedList = getUnscheduled(tasks);
  const pendingList = getPending(tasks);

  const isDate = planView.kind === 'date';
  const isWeek = planView.kind === 'week';
  const isMonth = planView.kind === 'month';
  const selD = parseDate(selectedDate);
  const isToday = selectedDate === tStr;
  const isFuture = selectedDate > tStr;
  const dateList = tasks
    .filter((t) => belongsToPlanDay(t, selectedDate))
    .sort((a, b) => Number(a.done) - Number(b.done) || pw[a.prio] - pw[b.prio]);
  const dateDoneN = dateList.filter((t) => t.done).length;

  let title = '';
  let subtitle = '';
  let summary: JSX.Element | null = null;
  let listHTML: React.ReactNode = null;

  if(isWeek || isMonth){
    const days = isWeek
      ? weekDays(selectedDate)
      : (() => {
          const a = calAnchorOf(selD);
          const dim = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
          return Array.from({ length: dim }, (_, i) => fmt(new Date(a.getFullYear(), a.getMonth(), i + 1)));
        })();
    const { total, done: doneN } = countPlanRange(tasks, days[0], days[days.length - 1]);
    if(isWeek){
      const a = parseDate(days[0]);
      const b = parseDate(days[6]);
      const rel = days.includes(tStr) ? ' · 本周' : '';
      title = `${isoYearOf(a)}年第${isoWeekNum(a)}周 · ${a.getMonth() + 1}月${a.getDate()}日–${b.getMonth() + 1}月${b.getDate()}日${rel}`;
    } else {
      const a = calAnchorOf(selD);
      const dim = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
      const cur = today();
      const rel = a.getFullYear() === cur.getFullYear() && a.getMonth() === cur.getMonth() ? ' · 当月' : '';
      title = `${a.getFullYear()}年${a.getMonth() + 1}月 · 1日–${dim}日${rel}`;
    }
    const un = unschedList.length;
    subtitle = total
      ? `共 ${total} 项 · 完成 ${doneN} · 未完成 ${total - doneN}${un ? ` · 待排期 ${un}` : ''}`
      : un
        ? `这段时间没有安排 · 待排期 ${un}`
        : '这段时间还没有安排';
    listHTML = total ? (
      <RangeList days={days} tasks={tasks} datePop={datePop} onPickDay={goToDate} />
    ) : (
      emptyTip(
        <>
          <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
          <path d="M8 2.5v4M16 2.5v4M3 10h18" />
        </>,
        isWeek ? '本周还没有安排' : '本月还没有安排',
        '留出一点空间，让日子自己长出来。',
      )
    );
  } else if (isDate) {
    title =
      `${selD.getMonth() + 1}月${selD.getDate()}日 ${dayNames[selD.getDay()]}` +
      (isToday ? ' · 今天' : '');
    subtitle = dateList.length
      ? `剩余 ${dateList.length - dateDoneN} 项 · 共 ${dateList.length} 项任务`
      : isFuture
        ? '还没有安排，添加一条吧'
        : '这一天没有任务记录';
    listHTML = dateList.length
      ? groupedRows(dateList, datePop)
      : emptyTip(
          <>
            <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
            <path d="M8 2.5v4M16 2.5v4M3 10h18" />
            <path d="M8 15h8" />
          </>,
          isFuture ? '还没有安排' : '这一天没有任务记录',
          isFuture ? '留出一点空间，让那天自己长出来。' : '过去的日子不必追，把注意力还给今天。',
        );
  } else if (planView.kind === 'overdue') {
    title = '逾期未完成';
    subtitle = overdueSubtitle(overdueList);
    summary = overdueList.length ? (
      <>
        <span>这些任务过了截止日还没完成。</span>
        <button className="batch-btn" onClick={() => moveAllToToday(overdueList.map((t) => t.id))}>
          全部移到今天
        </button>
      </>
    ) : null;
    listHTML = overdueList.length
      ? groupedRows(overdueList, datePop)
      : emptyTip(
          <>
            <path d="M9 11.5l2 2 4-4.5" />
            <circle cx="12" cy="12" r="9" />
          </>,
          '没有逾期任务',
          '过去的日子不必追，赶上的都是好日子。',
        );
  } else if (planView.kind === 'pending') {
    title = '全部待处理';
    subtitle = pendingSubtitle(pendingList);
    listHTML = pendingList.length ? (
      <PendingList tasks={pendingList} datePop={datePop} />
    ) : (
      emptyTip(<path d="M20 6L9 17l-5-5" />, '没有待处理的任务', '所有事情都已各归其位。')
    );
  } else {
    title = '待排期';
    subtitle = unschedList.length
      ? `${unschedList.length} 条想法 · 安排后会出现在日历上`
      : '所有想法都已各归其位';
    summary = unschedList.length ? (
      <>
        <span>来自笔记解析或快速收集，尚未安排日子。</span>
        <button
          className="batch-btn"
          onClick={() => moveAllToToday(unschedList.filter((t) => !t.done).map((t) => t.id))}
        >
          全部排到今天
        </button>
      </>
    ) : null;
    listHTML = unschedList.length
      ? groupedRows(unschedList, datePop)
      : emptyTip(
          <path d="M12 5v14M5 12h14" />,
          '没有待排期的想法',
          '笔记里解析出的新待办会先落在这里。',
        );
  }

  return (
    <div className="card plan-main">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p className="sub">{subtitle}</p>
        </div>
      </div>

      {!isDate && !isWeek && !isMonth && summary && <div className="view-summary">{summary}</div>}

      <div className="task-list">{listHTML}</div>
    </div>
  );
}
