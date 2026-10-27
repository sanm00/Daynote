import { TagSelect } from '@/components/TagSelect';
import { TagName } from '@/components/Tags';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import type { Task, TaskRange } from '@/types';
import {
  addDays,
  dateLabel,
  dateRangeLabel,
  doneAtLabel,
  fmt,
  nearestWeekend,
  today,
  todayStr,
} from '@/lib/date';
import { toast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import type { UseDatePop } from './useDatePop';

interface Props {
  t: Task;
  datePop: UseDatePop;
}

const rangeText = (r: TaskRange) =>
  r.begin === r.end ? dateLabel(r.begin) : dateRangeLabel(r.begin, r.end);

export function TaskRow({ t, datePop }: Props) {
  const reschedulingId = useAppStore((s) => s.reschedulingId);
  const setReschedulingId = useAppStore((s) => s.setReschedulingId);
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const rescheduleTask = useAppStore((s) => s.rescheduleTask);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.title);
  const [draftTag, setDraftTag] = useState(t.tag);
  const [justChecked, setJustChecked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const deletePending = useRef(false);

  useEffect(() => {
    if (!justChecked) return;
    const timer = window.setTimeout(() => setJustChecked(false), 300);
    return () => window.clearTimeout(timer);
  }, [justChecked]);

  const onToggle = () => {
    toggleTodo(t.id);
    if (!t.done) {
      setJustChecked(true);
    }
  };

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const isRescheduling = reschedulingId === t.id;
  useEffect(() => {
    if (!isRescheduling) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        datePop.close();
        setReschedulingId(null);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [isRescheduling, setReschedulingId, datePop.close]);

  const startEdit = () => {
    setDraft(t.title);
    setDraftTag(t.tag);
    setEditing(true);
  };
  const commitEdit = () => {
    if (!draft.trim()) {inputRef.current?.focus();return;}
    updateTask(t.id, { title: draft, tag: draftTag });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (deletePending.current) return;
    deletePending.current = true;
    try {
      const confirmed = await confirmDialog({
        title: '删除计划',
        message: `确定要删除计划「${t.title}」吗？此操作不可恢复。`,
        confirmText: '删除',
        cancelText: '取消',
        danger: true,
      });
      if (confirmed) deleteTask(t.id);
    } finally {
      deletePending.current = false;
    }
  };

  const tStr = todayStr();
  const isUnsched = t.beginDate === null;

  const applyReschedule = (range: TaskRange | null) => {
    const wasInbound = isUnsched;
    rescheduleTask(t.id, range);
    datePop.close();
    if (!range) toast('已移回待排期');
    else if (wasInbound) toast(`已排到 ${rangeText(range)}`);
    else toast(`已改期到 ${rangeText(range)}`);
  };

  if (reschedulingId === t.id) {
    const label = isUnsched ? '排期到' : '改期到';
    return (
      <div key={t.id} className={`task resched-row${isUnsched ? ' inbound' : ''}`} data-id={t.id}>
        <div className="resched-body">
          <div className="task-title">{t.title}</div>
          <div className="resched-actions">
            <span className="resched-label">{label}</span>
            <button className="chip" onClick={() => applyReschedule({ begin: tStr, end: tStr })}>
              今天
            </button>
            <button
              className="chip"
              onClick={() => {
                const d = fmt(addDays(today(), 1));
                applyReschedule({ begin: d, end: d });
              }}
            >
              明天
            </button>
            <button
              className="chip"
              onClick={() => {
                const d = fmt(nearestWeekend());
                applyReschedule({ begin: d, end: d });
              }}
            >
              本周末
            </button>
            <button
              className="chip"
              onClick={() => {
                const d = fmt(addDays(today(), 7));
                applyReschedule({ begin: d, end: d });
              }}
            >
              延后一周
            </button>
            <button
              type="button"
              className="chip resched-pick"
              title="选择具体日期，可跨天"
              onClick={(e) => {
                e.stopPropagation();
                datePop.open(
                  e.currentTarget,
                  isUnsched ? null : { begin: t.beginDate!, end: t.endDate! },
                  false,
                  (range) => {
                    if (range) applyReschedule(range);
                  },
                );
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

  if (editing) {
    return (
      <div key={t.id} className={`task rename-row${isUnsched ? ' inbound' : ''}`} data-id={t.id}>
        <div className="rename-body" onKeyDown={e => {
          if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            e.stopPropagation();
            setEditing(false);
          }
        }}>
          <input
            ref={inputRef}
            className="task-title-input"
            aria-label="任务标题"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.stopPropagation();
                e.preventDefault();
                commitEdit();
              }
            }}
          />
          <div className="task-edit-toolbar">
            <div className="task-tag-field">
              <TagSelect value={draftTag} onSelect={setDraftTag} label="选择任务标签" />
            </div>
            <div className="rename-actions">
              <button className="chip ghost task-edit-cancel" onClick={() => setEditing(false)}>
                取消
              </button>
              <button className="chip task-edit-save" onClick={commitEdit}>
                保存
              </button>
            </div>
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
  const schedAt = !isUnsched && t.endDate! < tStr;
  return (
    <div
      key={t.id}
      className={`task ${t.done ? 'is-done' : ''}${isUnsched ? ' inbound' : ''}${justChecked ? ' just-checked' : ''}`}
      data-id={t.id}
    >
      <button
        className="check"
        data-act="toggle"
        title={t.done ? '标记为未完成' : '标记完成'}
        onClick={onToggle}
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
          <span className="tag" data-tag={t.tag}><TagName id={t.tag} /></span>
          {t.done && t.doneAt ? (
            <>
              <i className="meta-dot" />
              {!isUnsched && (
                <span>计划于 {dateRangeLabel(t.beginDate, t.endDate)}</span>
              )}
              <i className="meta-dot" />
              <span>完成于 {doneAtLabel(t.doneAt)}</span>
            </>
          ) : (
            <>
              <i className="meta-dot" />
              {isUnsched ? (
                <span className="overdue-flag">未排期{t.source === 'note' ? ' · 来自笔记' : ''}</span>
              ) : (
                <>
                  <span>计划于 {dateRangeLabel(t.beginDate, t.endDate)}</span>
                  {schedAt && !t.done && (
                    <span className="overdue-tag" title="已逾期">
                      逾期
                    </span>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="task-actions">
        <button className="mini-btn" data-act="rename" title="编辑任务" onClick={startEdit}>
          编辑
        </button>
        {action}
        <button className="del" data-act="del" title="删除" onClick={() => void handleDelete()}>
          ×
        </button>
      </div>
    </div>
  );
}
