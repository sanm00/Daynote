import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { dateLabel, dateRangeLabel } from '@/lib/date';
import { toast } from '@/lib/toast';
import type { UseDatePop } from './useDatePop';

interface Props {
  datePop: UseDatePop;
}

/** Collapsible quick-add form (⌘I) with tag and date-range pickers. */
export function QuickAddForm({ datePop }: Props) {
  const tags = useAppStore(s => s.tags);
  const addTag = useAppStore((s) => s.addTag);
  const selectedTag = tags.find(t => t.id === addTag);
  const addBegin = useAppStore((s) => s.addBegin);
  const addEnd = useAppStore((s) => s.addEnd);
  const setAddTag = useAppStore((s) => s.setAddTag);
  const setAddRange = useAppStore((s) => s.setAddRange);
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
    inputRef.current?.focus();
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
    const begin = addBegin;
    submitQuickAdd(title);
    setText('');
    if (begin) {
      toast(
        `已排到 ${begin === addEnd ? dateLabel(begin) : dateRangeLabel(begin, addEnd)}`,
      );
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
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
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
                <i className="tag-dot" style={{ background: `var(--tag-${selectedTag?.color ?? 'work'})` }} />
                <span className="add-tag-label">{selectedTag?.name}</span>
                <svg className="caret" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div className={`tag-menu${tagMenuOpen ? ' open' : ''}`}>
                {tags.map(({id: tag, name, color}) => (
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
                    <i style={{ background: `var(--tag-${color})` }} />
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="date-select" id="dateSelect">
              <button
                type="button"
                className={`date-trigger${addBegin ? ' set' : ''}`}
                title="选择要安排的日期区间，留空则待排期"
                onClick={(e) => {
                  e.stopPropagation();
                  if (datePop.isOpenFor(e.currentTarget)) {
                    datePop.close();
                    return;
                  }
                  setTagMenuOpen(false);
                  datePop.open(
                    e.currentTarget,
                    addBegin ? { begin: addBegin, end: addEnd || addBegin } : null,
                    true,
                    (range) => {
                      setAddRange(range ? range.begin : '', range ? range.end : '');
                      datePop.close();
                      inputRef.current?.focus();
                    },
                  );
                }}
              >
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
                  <path d="M8 2.5v4M16 2.5v4M3 10h18" />
                </svg>
                <span className="dt-text">{dateRangeLabel(addBegin || null, addEnd || null)}</span>
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
