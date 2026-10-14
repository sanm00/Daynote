import { useAppStore } from '@/store';
import type { Task } from '@/types';
import { addDays, dateLabel, dateLabelFor, fmt, hmOf, nearestWeekend, today, todayStr } from '@/lib/date';
import { toast } from '@/lib/toast';
import type { UseDatePop } from './useDatePop';

interface Props {
  t: Task;
  datePop: UseDatePop;
}

export function TaskRow({ t, datePop }: Props) {
  const reschedulingId = useAppStore((s) => s.reschedulingId);
  const setReschedulingId = useAppStore((s) => s.setReschedulingId);
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const cycleTag = useAppStore((s) => s.cycleTag);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const rescheduleTask = useAppStore((s) => s.rescheduleTask);

  const tStr = todayStr();
  const isUnsched = t.date === null;

  const applyReschedule = (ds: string | null) => {
    const wasInbound = t.date === null;
    rescheduleTask(t.id, ds || null);
    datePop.close();
    if (!ds) toast('已移回待排期');
    else if (wasInbound) {
      const d = new Date(ds + 'T00:00:00');
      toast(`已排到 ${ds === tStr ? '今天' : `${d.getMonth() + 1}月${d.getDate()}日`}`);
    } else toast(`已改期到 ${dateLabel(ds)}`);
  };

  if (reschedulingId === t.id) {
    const label = isUnsched ? '排期到' : '改期到';
    return (
      <div key={t.id} className={`task resched-row${isUnsched ? ' inbound' : ''}`} data-id={t.id}>
        <div className="resched-body">
          <div className="task-title">{t.title}</div>
          <div className="resched-actions">
            <span className="resched-label">{label}</span>
            <button className="chip" onClick={() => applyReschedule(tStr)}>
              今天
            </button>
            <button className="chip" onClick={() => applyReschedule(fmt(addDays(today(), 1)))}>
              明天
            </button>
            <button className="chip" onClick={() => applyReschedule(fmt(nearestWeekend()))}>
              本周末
            </button>
            <button className="chip" onClick={() => applyReschedule(fmt(addDays(today(), 7)))}>
              延后一周
            </button>
            <button
              type="button"
              className="chip resched-pick"
              title="选择具体日期"
              onClick={(e) => {
                e.stopPropagation();
                datePop.open(e.currentTarget, t.date || '', false, (ds) => {
                  if (ds) applyReschedule(ds);
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
}
