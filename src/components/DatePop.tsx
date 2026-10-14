import { useEffect, useState } from 'react';
import { addDays, fmt, parseDate, today, todayStr } from '../lib/date';

export interface DatePopProps {
  open: boolean;
  anchorRect: DOMRect | null;
  value: string;
  allowClear?: boolean;
  onPick: (ds: string) => void;
  onClose: () => void;
}

export function DatePop({ open, anchorRect, value, allowClear = true, onPick, onClose }: DatePopProps) {
  const [popMonth, setPopMonth] = useState(() => {
    const t = today();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useEffect(() => {
    if (!open) return;
    const base = value ? parseDate(value) : today();
    setPopMonth(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [open, value]);

  useEffect(() => {
    if (!open || !anchorRect) return;
    const measure = () => {
      const r = anchorRect;
      const pw = 234;
      const ph = 268;
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

  const y = popMonth.getFullYear();
  const m = popMonth.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  const days: JSX.Element[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const ds = fmt(d);
    const cls = ['day'];
    if (d.getMonth() !== m) cls.push('other');
    if (ds === todayStr()) cls.push('today');
    if (ds === value) cls.push('selected');
    days.push(
      <div key={ds} className={cls.join(' ')} data-pdate={ds} onClick={() => onPick(ds)}>
        <span>{d.getDate()}</span>
      </div>,
    );
  }

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
      <div className="pop-foot" style={{ display: allowClear ? '' : 'none' }}>
        <button type="button" className="pop-chip" data-preset="today" onClick={() => onPick(todayStr())}>
          今天
        </button>
        <button
          type="button"
          className="pop-chip"
          data-preset="tomorrow"
          onClick={() => onPick(fmt(addDays(today(), 1)))}
        >
          明天
        </button>
        <button type="button" className="pop-chip" data-preset="clear" onClick={() => onPick('')}>
          待排期
        </button>
      </div>
    </div>
  );
}
