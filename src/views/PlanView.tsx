import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import type { Priority, Task } from '@/types';
import {
  addDays,
  dateLabel,
  dateLabelFor,
  dayNames,
  fmt,
  hmOf,
  nearestWeekend,
  parseDate,
  today,
  todayStr,
} from '@/lib/date';
import { TAG_DOT, TAG_ORDER } from '@/lib/tags';
import { toast } from '@/lib/toast';
import { DatePop } from '@/components/DatePop';

const pw: Record<Priority, number> = { high: 0, mid: 1, low: 2 };

const getOverdue = (tasks: Task[]) => {
  const tStr = todayStr();
  return tasks.filter((t) => !t.done && t.date && t.date < tStr).sort((a, b) => b.date!.localeCompare(a.date!));
};
const getUnscheduled = (tasks: Task[]) =>
  tasks
    .filter((t) => t.date === null)
    .sort((a, b) => Number(a.done) - Number(b.done) || (b.parsedAt || '').localeCompare(a.parsedAt || ''));
const getPending = (tasks: Task[]) => tasks.filter((t) => !t.done);

export function PlanView() {
  const tasks = useAppStore((s) => s.tasks);
  const planView = useAppStore((s) => s.planView);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const calMonth = useAppStore((s) => s.calMonth);
  const addTag = useAppStore((s) => s.addTag);
  const addDate = useAppStore((s) => s.addDate);
  const reschedulingId = useAppStore((s) => s.reschedulingId);
  const newTodoPending = useAppStore((s) => s.newTodoPending);
  const consumeNewTodo = useAppStore((s) => s.consumeNewTodo);

  const setPlanView = useAppStore((s) => s.setPlanView);
  const goToDate = useAppStore((s) => s.goToDate);
  const setCalMonth = useAppStore((s) => s.setCalMonth);
  const setAddDate = useAppStore((s) => s.setAddDate);
  const setAddTag = useAppStore((s) => s.setAddTag);
  const setReschedulingId = useAppStore((s) => s.setReschedulingId);
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const cycleTag = useAppStore((s) => s.cycleTag);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const rescheduleTask = useAppStore((s) => s.rescheduleTask);
  const submitQuickAdd = useAppStore((s) => s.submitQuickAdd);
  const postponeUnfinished = useAppStore((s) => s.postponeUnfinished);
  const moveAllToToday = useAppStore((s) => s.moveAllToToday);

  const [quickText, setQuickText] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const quickInputRef = useRef<HTMLTextAreaElement>(null);

  const [pop, setPop] = useState<{
    open: boolean;
    anchorRect: DOMRect | null;
    value: string;
    allowClear: boolean;
    onPick: (ds: string) => void;
  }>({ open: false, anchorRect: null, value: '', allowClear: true, onPick: () => {} });

  const openDatePop = (
    anchor: HTMLElement,
    value: string,
    allowClear: boolean,
    onPick: (ds: string) => void,
  ) => {
    const same = pop.open && pop.anchorRect && false;
    void same;
    setPop({ open: true, anchorRect: anchor.getBoundingClientRect(), value, allowClear, onPick });
  };
  const closeDatePop = () => setPop((p) => ({ ...p, open: false }));

  // Clicking anywhere outside the tag menu closes it (mirrors the demo's
  // document-level handler).
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('#tagSelect')) setTagMenuOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // ⌘I from anywhere: jump to the plan page and open the quick-add form with its
  // input focused. The pending flag is consumed once handled, so merely
  // navigating to this page never triggers it.
  const handledNewTodo = useRef(false);
  useEffect(() => {
    if (!newTodoPending) {
      handledNewTodo.current = false;
      return;
    }
    if (handledNewTodo.current) return;
    handledNewTodo.current = true;
    setQuickOpen(true);
    consumeNewTodo();
  }, [newTodoPending, consumeNewTodo]);

  // Whenever the quick-add form unfolds, put the caret in it synchronously so the
  // keystroke that opened it (⌘I, or a button click) never drops focus on body.
  useLayoutEffect(() => {
    if (quickOpen) quickInputRef.current?.focus();
  }, [quickOpen]);

  // ---- calendar ----
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
    const dayTasks = tasks.filter((t) => t.date === ds);
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

  // ---- metrics ----
  const overdueList = getOverdue(tasks);
  const unschedList = getUnscheduled(tasks);
  const pendingList = getPending(tasks);

  // ---- task panel ----
  const isDate = planView.kind === 'date';
  const selD = parseDate(selectedDate);
  const isToday = selectedDate === tStr;
  const isFuture = selectedDate > tStr;
  const dateList = tasks
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => Number(a.done) - Number(b.done) || pw[a.prio] - pw[b.prio]);
  const dateDoneN = dateList.filter((t) => t.done).length;

  let title = '';
  let subtitle = '';
  let summary: JSX.Element | null = null;
  let listHTML: JSX.Element[] | JSX.Element = [];

  const renderRow = (t: Task) => {
    const isUnsched = t.date === null;
    if (reschedulingId === t.id) {
      const label = isUnsched ? '排期到' : '改期到';
      return (
        <div key={t.id} className={`task resched-row${isUnsched ? ' inbound' : ''}`} data-id={t.id}>
          <div className="resched-body">
            <div className="task-title">{t.title}</div>
            <div className="resched-actions">
              <span className="resched-label">{label}</span>
              <button className="chip" onClick={() => applyReschedule(t, tStr)}>
                今天
              </button>
              <button className="chip" onClick={() => applyReschedule(t, fmt(addDays(today(), 1)))}>
                明天
              </button>
              <button className="chip" onClick={() => applyReschedule(t, fmt(nearestWeekend()))}>
                本周末
              </button>
              <button className="chip" onClick={() => applyReschedule(t, fmt(addDays(today(), 7)))}>
                延后一周
              </button>
              <button
                type="button"
                className="chip resched-pick"
                title="选择具体日期"
                onClick={(e) => {
                  e.stopPropagation();
                  openDatePop(e.currentTarget, t.date || '', false, (ds) => {
                    if (ds) applyReschedule(t, ds);
                  });
                }}
              >
                选择日期
              </button>
              <button className="chip ghost" onClick={() => setReschedulingId(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      );
    }
    const action = (
      <button
        className="mini-btn"
        data-act="resched"
        title={isUnsched ? '安排到某天' : '改期'}
        onClick={() => setReschedulingId(t.id)}
      >
        {isUnsched ? '排期' : '改期'}
      </button>
    );
    const schedAt = !isUnsched && t.date! < tStr;
    return (
      <div
        key={t.id}
        className={`task ${t.done ? 'is-done' : ''}${isUnsched ? ' inbound' : ''}`}
        data-id={t.id}
      >
        <button
          className="check"
          data-act="toggle"
          title={t.done ? '标记为未完成' : '标记完成'}
          onClick={() => toggleTodo(t.id)}
        >
          {t.done && (
            <svg viewBox="0 0 24 24">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          )}
        </button>
        <div className="task-body">
          <div className="task-title">{t.title}</div>
          <div className="task-meta">
            <span
              className="tag clickable"
              data-act="tag"
              data-tag={t.tag}
              title="点击切换标签"
              onClick={() => cycleTag(t.id)}
            >
              {t.tag}
            </span>
            {t.done && t.doneAt && (
              <>
                <i className="meta-dot" />
                <span>完成于 {hmOf(t.doneAt)}</span>
              </>
            )}
            <i className="meta-dot" />
            {isUnsched ? (
              <span className="overdue-flag">未排期{t.source === 'note' ? ' · 来自笔记' : ''}</span>
            ) : (
              <span className={schedAt && !t.done ? 'overdue-flag' : ''}>
                {dateLabelFor(t.date!, t.done)}
              </span>
            )}
          </div>
        </div>
        <span className={`prio ${t.prio}`} title="优先级" />
        <div className="task-actions">
          {action}
          <button className="del" data-act="del" title="删除" onClick={() => deleteTask(t.id)}>
            ×
          </button>
        </div>
      </div>
    );
  };

  const groupedRows = (list: Task[]) => {
    const todo = list.filter((t) => !t.done);
    const done = list.filter((t) => t.done);
    const out: JSX.Element[] = [];
    if (todo.length) {
      out.push(
        <div key="g-todo" className="group-label">
          待完成 · {todo.length}
        </div>,
      );
      out.push(...todo.map(renderRow));
    }
    if (done.length) {
      out.push(
        <div key="g-done" className="group-label">
          已完成 · {done.length}
        </div>,
      );
      out.push(...done.map(renderRow));
    }
    return out;
  };

  const emptyTip = (svg: JSX.Element, main: string, sub: string) => (
    <div className="empty-tip" style={{ padding: '34px 0' }}>
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        {svg}
      </svg>
      <span>{main}</span>
      <span className="tip-sub">{sub}</span>
    </div>
  );

  const applyReschedule = (t: Task, ds: string | null) => {
    const wasInbound = t.date === null;
    rescheduleTask(t.id, ds || null);
    closeDatePop();
    if (!ds) toast('已移回待排期');
    else if (wasInbound) {
      const d = parseDate(ds);
      toast(`已排到 ${ds === tStr ? '今天' : `${d.getMonth() + 1}月${d.getDate()}日`}`);
    } else toast(`已改期到 ${dateLabel(ds)}`);
  };

  if (isDate) {
    title =
      `${selD.getMonth() + 1}月${selD.getDate()}日 ${dayNames[selD.getDay()]}` + (isToday ? ' · 今天' : '');
    subtitle = dateList.length
      ? `${dateList.length} 项任务 · 已完成 ${dateDoneN} 项`
      : isFuture
        ? '还没有安排，添加一条吧'
        : '这一天没有任务记录';
    listHTML = dateList.length
      ? groupedRows(dateList)
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
    const oldest = overdueList[overdueList.length - 1];
    subtitle = overdueList.length
      ? `${overdueList.length} 项 · 最早 ${
          oldest ? `${parseDate(oldest.date!).getMonth() + 1}月${parseDate(oldest.date!).getDate()}日` : ''
        }`
      : '没有逾期任务，很好';
    summary = overdueList.length ? (
      <>
        <span>这些任务过了截止日还没完成。</span>
        <button className="batch-btn" onClick={() => moveAllToToday(overdueList.map((t) => t.id))}>
          全部移到今天
        </button>
      </>
    ) : null;
    listHTML = overdueList.length
      ? groupedRows(overdueList)
      : emptyTip(
          <>
            <path d="M9 11.5l2 2 4-4.5" />
            <circle cx="12" cy="12" r="9" />
          </>,
          '没有逾期任务',
          '过去的日子不必追，赶上的都是好日子。',
        );
  } else if (planView.kind === 'pending') {
    const od = pendingList.filter((t) => t.date && t.date < tStr).sort((a, b) => a.date!.localeCompare(b.date!));
    const td = pendingList.filter((t) => t.date === tStr).sort((a, b) => pw[a.prio] - pw[b.prio]);
    const fut = pendingList.filter((t) => t.date && t.date > tStr).sort((a, b) => a.date!.localeCompare(b.date!));
    const un = pendingList
      .filter((t) => t.date === null)
      .sort((a, b) => (b.parsedAt || '').localeCompare(a.parsedAt || ''));
    title = '全部待处理';
    subtitle = pendingList.length
      ? `${pendingList.length} 项未完成 · 逾期 ${od.length} · 待排期 ${un.length}`
      : '暂时清空了，真好';
    const seg = (label: string, arr: Task[]) =>
      arr.length ? (
        <>
          <div className="group-label">
            {label} · {arr.length}
          </div>
          {arr.map(renderRow)}
        </>
      ) : null;
    listHTML = pendingList.length ? (
      <>
        {seg('逾期', od)}
        {seg('今天', td)}
        {seg('未来', fut)}
        {seg('待排期', un)}
      </>
    ) : (
      emptyTip(
        <path d="M20 6L9 17l-5-5" />,
        '没有待处理的任务',
        '所有事情都已各归其位。',
      )
    );
  } else {
    title = '待排期';
    subtitle = unschedList.length ? `${unschedList.length} 条想法 · 安排后会出现在日历上` : '所有想法都已各归其位';
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
      ? groupedRows(unschedList)
      : emptyTip(
          <path d="M12 5v14M5 12h14" />,
          '没有待排期的想法',
          '笔记里解析出的新待办会先落在这里。',
        );
  }

  const closeQuickAdd = () => {
    closeDatePop();
    setTagMenuOpen(false);
    setQuickText('');
    setQuickOpen(false);
  };

  const handleQuickSubmit = () => {
    const title = quickText.trim();
    if (!title) {
      quickInputRef.current?.focus();
      return;
    }
    const date = addDate || null;
    submitQuickAdd(title);
    setQuickText('');
    if (date) {
      const d = parseDate(date);
      toast(`已排到 ${date === tStr ? '今天' : `${d.getMonth() + 1}月${d.getDate()}日`}`);
    } else toast('已存入待排期');
    closeDatePop();
    quickInputRef.current?.focus();
  };

  return (
    <section className="page active" id="page-plan">
      <div className="plan-layout">
        <div className="plan-side">
          <button
            type="button"
            className="btn primary quick-new-btn"
            title="新建待办（⌘I）"
            onClick={() => {
              if (quickOpen) {
                closeQuickAdd();
                return;
              }
              setQuickOpen(true);
            }}
          >
            + 新建待办
            <span className="btn-hint">⌘I</span>
          </button>

          {quickOpen && (
          <form
            className="quick-new-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleQuickSubmit();
            }}
          >
              <textarea
                ref={quickInputRef}
                id="quickNewInput"
                placeholder="添加任务，回车确认（Shift + 回车换行）"
                rows={2}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleQuickSubmit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeQuickAdd();
                  }
                }}
              />
              <div className="qn-controls">
                <div className="tag-select" id="tagSelect">
                  <button
                    type="button"
                    className="tag-trigger"
                    title="选择标签"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTagMenuOpen((v) => !v);
                    }}
                  >
                    <i className="tag-dot" style={{ background: TAG_DOT[addTag] }} />
                    <svg className="caret" viewBox="0 0 24 24">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <div className={`tag-menu${tagMenuOpen ? ' open' : ''}`}>
                    {TAG_ORDER.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        data-tag={tag}
                        className={tag === addTag ? 'active' : ''}
                        onClick={() => {
                          setAddTag(tag);
                          setTagMenuOpen(false);
                        }}
                      >
                        <i style={{ background: TAG_DOT[tag] }} />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="date-select" id="dateSelect">
                  <button
                    type="button"
                    className={`date-trigger${addDate ? ' set' : ''}`}
                    title="选择要安排的日期，留空则待排期"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pop.open) {
                        closeDatePop();
                        return;
                      }
                      setTagMenuOpen(false);
                      openDatePop(e.currentTarget, addDate, true, (ds) => {
                        setAddDate(ds);
                        closeDatePop();
                        quickInputRef.current?.focus();
                      });
                    }}
                  >
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
                      <path d="M8 2.5v4M16 2.5v4M3 10h18" />
                    </svg>
                    <span className="dt-text">{dateLabel(addDate)}</span>
                  </button>
                </div>
                <button type="submit" className="btn primary qn-submit">
                  添加
                </button>
              </div>
            </form>
          )}

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

          <div className="metric-row">
            <button
              className={`metric-card overdue${!overdueList.length ? ' zero' : ''}${
                planView.kind === 'overdue' ? ' active' : ''
              }`}
              data-view="overdue"
              title="查看逾期未完成任务"
              onClick={() => setPlanView('overdue')}
            >
              <span className="metric-num">{overdueList.length}</span>
              <span className="metric-label">逾期</span>
            </button>
            <button
              className={`metric-card unsched${!unschedList.length ? ' zero' : ''}${
                planView.kind === 'unscheduled' ? ' active' : ''
              }`}
              data-view="unscheduled"
              title="查看待排期想法"
              onClick={() => setPlanView('unscheduled')}
            >
              <span className="metric-num">{unschedList.length}</span>
              <span className="metric-label">待排期</span>
            </button>
          </div>

          <button
            className={`pending-card${!pendingList.length ? ' zero' : ''}${
              planView.kind === 'pending' ? ' active' : ''
            }`}
            data-view="pending"
            title="查看全部待处理任务"
            onClick={() => setPlanView('pending')}
          >
            <span className="pending-label">全部待处理</span>
            <span className="pending-num">{pendingList.length}</span>
          </button>
        </div>

        <div className="card plan-main">
          <div className="panel-head">
            <div>
              <h2>{title}</h2>
              <p className="sub">{subtitle}</p>
            </div>
            <div className="panel-head-actions">
              {isDate && (
                <>
                  <button
                    className="icon-btn"
                    title="前一天"
                    onClick={() => goToDate(fmt(addDays(selD, -1)))}
                  >
                    ‹
                  </button>
                  <button className="btn ghost sm" onClick={() => goToDate(tStr)}>
                    今天
                  </button>
                  <button
                    className="btn ghost sm"
                    title="把这一天未完成的任务移到下一天"
                    onClick={() => {
                      const before = tasks.filter((t) => t.date === selectedDate && !t.done).length;
                      postponeUnfinished();
                      if (before) toast(`已把 ${before} 项未完成任务顺延到 ${fmt(addDays(selD, 1))}`);
                      else toast('这一天没有未完成的任务');
                    }}
                  >
                    顺延未完成
                  </button>
                  <button
                    className="icon-btn"
                    title="后一天"
                    onClick={() => goToDate(fmt(addDays(selD, 1)))}
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>

          {isDate && (
            <div className="progress-line">
              <i style={{ width: `${dateList.length ? (dateDoneN / dateList.length) * 100 : 0}%` }} />
            </div>
          )}

          {!isDate && summary && <div className="view-summary">{summary}</div>}

          <div className="task-list">{listHTML}</div>
        </div>
      </div>

      <DatePop
        open={pop.open}
        anchorRect={pop.anchorRect}
        value={pop.value}
        allowClear={pop.allowClear}
        onPick={pop.onPick}
        onClose={closeDatePop}
      />
    </section>
  );
}
