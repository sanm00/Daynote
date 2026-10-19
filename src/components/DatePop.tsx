import { useEffect, useState } from 'react';
import { addDays, dateRangeLabel, fmt, parseDate, today, todayStr } from '@/lib/date';
import type { TaskRange } from '@/types';

export interface DatePopProps {
  open: boolean;
  anchorRect: DOMRect | null;
  value: TaskRange | null;
  allowClear?: boolean;
  /** A picked inclusive span, or `null` when the user clears the schedule. */
  onPick: (range: TaskRange | null) => void;
  onClose: () => void;
}

/** Highlighted span: the pending `begin` + hovered end, or the current value. */
function activeRange(
  pending: string | null,
  hover: string | null,
  value: TaskRange | null,
): { lo: string; hi: string } | null {
  if (pending) {
    const b = hover || pending;
    return pending <= b ? { lo: pending, hi: b } : { lo: b, hi: pending };
  }
  if (value && value.begin) {
    return value.begin <= value.end
      ? { lo: value.begin, hi: value.end }
      : { lo: value.end, hi: value.begin };
  }
  return null;
}

export function DatePop({
  open,
  anchorRect,
  value,
  allowClear = true,
  onPick,
  onClose,
}: DatePopProps) {
  const [popMonth, setPopMonth] = useState(() => {
    const t = today();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPending(null);
    setHover(null);
    const base = value?.begin ? parseDate(value.begin) : today();
    setPopMonth(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [open, value?.begin, value?.end]);

  useEffect(() => {
    if (!open || !anchorRect) return;
    const measure = () => {
      const r = anchorRect;
      const pw = 234;
      const ph = 300;
      let left = Math.max(8, Math.min(r.right - pw, window.innerWidth - pw - 8));
      let top = r.bottom + 6;
      if (top + ph > window.innerHeight - 8) top = r.top - ph - 6;
      top = Math.max(8, Math.min(top, window.innerHeight - ph - 8));
      setPos({ left, top });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, anchorRect, popMonth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('#datePop') && !t.closest('#dateSelect')) onClose();
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open, onClose]);

  if (!open) return null;

  const commit = (begin: string, end: string | null) => {
    if (!begin) {
      onPick(null);
      return;
    }
    onPick(begin <= (end || begin) ? { begin, end: end || begin } : { begin: end!, end: begin });
  };

  const pickDay = (ds: string) => {
    if (!pending) {
      setPending(ds);
      return;
    }
    const a = pending;
    commit(a <= ds ? a : ds, a <= ds ? ds : a);
  };

  const y = popMonth.getFullYear();
  const m = popMonth.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  const range = activeRange(pending, hover, value);
  const days: JSX.Element[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const ds = fmt(d);
    const cls = ['day'];
    if (d.getMonth() !== m) cls.push('other');
    if (ds === todayStr()) cls.push('today');
    if (range) {
      if (ds === range.lo && ds === range.hi) cls.push('selected');
      else if (ds === range.lo) cls.push('range-lo');
      else if (ds === range.hi) cls.push('range-hi');
      else if (ds > range.lo && ds < range.hi) cls.push('in-range');
    }
    days.push(
      <div
        key={ds}
        className={cls.join(' ')}
        data-pdate={ds}
        onClick={(e) => {
          e.stopPropagation();
          pickDay(ds);
        }}
        onMouseOver={() => {
          if (pending && hover !== ds) setHover(ds);
        }}
      >
        <span>{d.getDate()}</span>
      </div>,
    );
  }

  const hint = pending
    ? '再点一天作为结束日 · 同一天两次即为单日'
    : value?.begin
      ? dateRangeLabel(value.begin, value.end)
      : '先点开始日，再点结束日可排成一整段';

  return (
    <div className="date-pop open" id="datePop" style={{ left: pos.left, top: pos.top }}>
      <div className="cal-head">
        <button
          type="button"
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            setPopMonth(new Date(y, m - 1, 1));
          }}
        >
          ‹
        </button>
        <div className="cal-title">{`${y}年${m + 1}月`}</div>
        <button
          type="button"
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            setPopMonth(new Date(y, m + 1, 1));
          }}
        >
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
      <div className="cal-grid pop-grid">{days}</div>
      <div className="pop-hint">{hint}</div>
      <div className="pop-foot" style={{ display: allowClear ? '' : 'none' }}>
        <button
          type="button"
          className="pop-chip"
          data-preset="today"
          onClick={(e) => {
            e.stopPropagation();
            commit(todayStr(), todayStr());
          }}
        >
          今天
        </button>
        <button
          type="button"
          className="pop-chip"
          data-preset="tomorrow"
          onClick={(e) => {
            e.stopPropagation();
            const t = fmt(addDays(today(), 1));
            commit(t, t);
          }}
        >
          明天
        </button>
        <button
          type="button"
          className="pop-chip"
          data-preset="clear"
          onClick={(e) => {
            e.stopPropagation();
            onPick(null);
          }}
        >
          待排期
        </button>
      </div>
    </div>
  );
}
