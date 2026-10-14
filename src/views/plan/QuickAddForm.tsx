import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { dateLabel, parseDate, todayStr } from '@/lib/date';
import { TAG_DOT, TAG_ORDER } from '@/lib/tags';
import { toast } from '@/lib/toast';
import type { UseDatePop } from './useDatePop';

interface Props {
  datePop: UseDatePop;
}

/** Collapsible quick-add form (⌘I) with tag and date pickers. */
export function QuickAddForm({ datePop }: Props) {
  const addTag = useAppStore((s) => s.addTag);
  const addDate = useAppStore((s) => s.addDate);
  const setAddTag = useAppStore((s) => s.setAddTag);
  const setAddDate = useAppStore((s) => s.setAddDate);
  const newTodoPending = useAppStore((s) => s.newTodoPending);
  const consumeNewTodo = useAppStore((s) => s.consumeNewTodo);
  const submitQuickAdd = useAppStore((s) => s.submitQuickAdd);

  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    setOpen(true);
    consumeNewTodo();
  }, [newTodoPending, consumeNewTodo]);

  // Whenever the form unfolds, put the caret in it synchronously so the
  // keystroke that opened it (⌘I, or a button click) never drops focus on body.
  useLayoutEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Clicking anywhere outside the tag menu closes it (mirrors the demo's
  // document-level handler).
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('#tagSelect')) setTagMenuOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const close = () => {
    datePop.close();
    setTagMenuOpen(false);
    setText('');
    setOpen(false);
  };

  const submit = () => {
    const title = text.trim();
    if (!title) {
      inputRef.current?.focus();
      return;
    }
    const date = addDate || null;
    submitQuickAdd(title);
    setText('');
    if (date) {
      const d = parseDate(date);
      toast(`已排到 ${date === todayStr() ? '今天' : `${d.getMonth() + 1}月${d.getDate()}日`}`);
    } else toast('已存入待排期');
    datePop.close();
    inputRef.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        className="btn primary quick-new-btn"
        title="新建待办（⌘I）"
        onClick={() => {
          if (open) {
            close();
            return;
          }
          setOpen(true);
        }}
      >
        + 新建待办
        <span className="btn-hint">⌘I</span>
      </button>

      {open && (
        <form
          className="quick-new-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={inputRef}
            id="quickNewInput"
            placeholder="添加任务，回车确认（Shift + 回车换行）"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                close();
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
                  if (datePop.isOpenFor(e.currentTarget)) {
                    datePop.close();
                    return;
                  }
                  setTagMenuOpen(false);
                  datePop.open(e.currentTarget, addDate, true, (ds) => {
                    setAddDate(ds);
                    datePop.close();
                    inputRef.current?.focus();
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
    </>
  );
}
