import type { Task } from '@/types';
import { PRIORITY_WEIGHT as pw } from '@/lib/selectors';
import { parseDate, todayStr } from '@/lib/date';
import { TaskRow } from './TaskRow';
import type { UseDatePop } from './useDatePop';

interface ListProps {
  tasks: Task[];
  datePop: UseDatePop;
}

export function groupedRows(list: Task[], datePop: UseDatePop) {
  const todo = list.filter((t) => !t.done);
  const done = list.filter((t) => t.done);
  const out: JSX.Element[] = [];
  if (todo.length) {
    out.push(
      <div key="g-todo" className="group-label">
        待完成 · {todo.length}
      </div>,
    );
    out.push(...todo.map((t) => <TaskRow key={t.id} t={t} datePop={datePop} />));
  }
  if (done.length) {
    out.push(
      <div key="g-done" className="group-label">
        已完成 · {done.length}
      </div>,
    );
    out.push(...done.map((t) => <TaskRow key={t.id} t={t} datePop={datePop} />));
  }
  return out;
}

export function emptyTip(svg: JSX.Element, main: string, sub: string) {
  return (
    <div className="empty-tip" style={{ padding: '34px 0' }}>
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        {svg}
      </svg>
      <span>{main}</span>
      <span className="tip-sub">{sub}</span>
    </div>
  );
}

/** Pending view: overdue / today / future / unscheduled segments. */
export function PendingList({ tasks, datePop }: ListProps) {
  const tStr = todayStr();
  const od = tasks
    .filter((t) => t.date && t.date < tStr)
    .sort((a, b) => a.date!.localeCompare(b.date!));
  const td = tasks
    .filter((t) => t.date === tStr)
    .sort((a, b) => pw[a.prio] - pw[b.prio]);
  const fut = tasks
    .filter((t) => t.date && t.date > tStr)
    .sort((a, b) => a.date!.localeCompare(b.date!));
  const un = tasks
    .filter((t) => t.date === null)
    .sort((a, b) => (b.parsedAt || '').localeCompare(a.parsedAt || ''));
  const seg = (label: string, arr: Task[]) =>
    arr.length ? (
      <>
        <div className="group-label">
          {label} · {arr.length}
        </div>
        {arr.map((t) => (
          <TaskRow key={t.id} t={t} datePop={datePop} />
        ))}
      </>
    ) : null;
  return (
    <>
      {seg('逾期', od)}
      {seg('今天', td)}
      {seg('未来', fut)}
      {seg('待排期', un)}
    </>
  );
}

/** Subtitle for the pending header, e.g. "12 项未完成 · 逾期 2 · 待排期 5". */
export function pendingSubtitle(tasks: Task[]): string {
  if (!tasks.length) return '暂时清空了，真好';
  const tStr = todayStr();
  const od = tasks.filter((t) => t.date && t.date < tStr).length;
  const un = tasks.filter((t) => t.date === null).length;
  return `${tasks.length} 项未完成 · 逾期 ${od} · 待排期 ${un}`;
}

/** Subtitle for the overdue header, with the oldest due date. */
export function overdueSubtitle(list: Task[]): string {
  if (!list.length) return '没有逾期任务，很好';
  const oldest = list[list.length - 1];
  const d = oldest ? parseDate(oldest.date!) : null;
  return `${list.length} 项 · 最早 ${d ? `${d.getMonth() + 1}月${d.getDate()}日` : ''}`;
}
