import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { PRIORITY_WEIGHT as pw } from '@/lib/selectors';
import { getOverdue, occursOn } from '@/lib/selectors';
import { todayStr } from '@/lib/date';
import { toast } from '@/lib/toast';
import type { Task } from '@/types';

type NoticeCfg = { icon: string; nIcon: string; title: string; copy: string };

export function TodayOverview() {
  const tasks = useAppStore((s) => s.tasks);
  const goToDate = useAppStore((s) => s.goToDate);
  const setPage = useAppStore((s) => s.setPage);

  const cardRef = useRef<HTMLDivElement>(null);
  const segsRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const tStr = todayStr();
  const ordered = useMemo(() => {
    const done = tasks.filter((t) => occursOn(t, tStr) && t.done);
    const todo = tasks
      .filter((t) => occursOn(t, tStr) && !t.done)
      .sort((a, b) => pw[a.prio] - pw[b.prio]);
    return [...done, ...todo];
  }, [tasks, tStr]);

  const total = ordered.length;
  const doneN = ordered.filter((t) => t.done).length;
  const remaining = total - doneN;
  const pending = ordered.filter((t) => !t.done);
  const overdue = useMemo(() => getOverdue(tasks), [tasks]);
  const pct = total ? Math.round((doneN / total) * 100) : 0;
  const isComplete = total > 0 && doneN === total;
  const warn = !isComplete && overdue.length > 0;
  const h = now.getHours() + now.getMinutes() / 60;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const notice: NoticeCfg = (() => {
    if (isComplete)
      return { icon: '✓', nIcon: '☻', title: '太棒了！', copy: '今天的任务全部完成！好好犒劳一下自己吧～' };
    if (warn)
      return {
        icon: '!',
        nIcon: '!',
        title: `有 ${overdue.length} 项已逾期！`,
        copy: `剩余 ${remaining} 项未完成。先挑一件最重要的继续推进。`,
      };
    if (!total)
      return { icon: '☾', nIcon: '🍃', title: '留一点自由时间', copy: '今天还没有安排，可以从笔记里添加一些新计划～' };
    if (h < 12)
      return { icon: '☀', nIcon: '☀', title: '上午好！', copy: `今天还有 ${remaining} 项待完成，记得按计划推进哦～` };
    if (h < 18) {
      const names = pending.slice(0, 2).map((t) => t.title.split('\n')[0]).join('、');
      return {
        icon: '☁',
        nIcon: '⏰',
        title: '下午好！',
        copy: `剩余 ${remaining} 项未完成${names ? '：' + names : ''}，加油完成今天的计划吧。`,
      };
    }
    return { icon: '☾', nIcon: '🌙', title: '晚上好！', copy: `今天还有 ${remaining} 项未完成，早点休息，明天继续～` };
  })();

  const showTip = (seg: HTMLButtonElement) => {
    const tip = tipRef.current;
    const card = cardRef.current;
    const segs = segsRef.current;
    if (!tip || !card || !segs) return;
    tip.textContent = seg.dataset.tip || '';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.classList.add('show');
    const cardRect = card.getBoundingClientRect();
    const segRect = seg.getBoundingClientRect();
    const segsRect = segs.getBoundingClientRect();
    const pad = 6;
    const maxW = card.clientWidth - pad * 2;
    tip.style.maxWidth = maxW + 'px';
    const tipW = Math.min(tip.offsetWidth, maxW);
    const tipH = tip.offsetHeight;
    const center = segRect.left - cardRect.left + segRect.width / 2;
    let left = center - tipW / 2;
    left = Math.max(pad, Math.min(left, card.clientWidth - pad - tipW));
    let top = segsRect.top - cardRect.top - tipH - 7;
    if (top < pad) top = segsRect.bottom - cardRect.top + 7;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  };
  const hideTip = () => tipRef.current?.classList.remove('show');

  const locate = (t: Task) => {
    if (!t.beginDate) return;
    setPage('plan');
    goToDate(tStr);
    toast(`已定位到 ${tStr} 的任务`);
    const start = performance.now();
    const tick = () => {
      const row = document.querySelector<HTMLElement>(`.task[data-id="${t.id}"]`);
      if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        row.classList.remove('flash');
        void row.offsetWidth;
        row.classList.add('flash');
        window.setTimeout(() => row.classList.remove('flash'), 1400);
        return;
      }
      if (performance.now() - start < 1500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const cls = ['today-card'];
  if (warn) cls.push('warn');
  if (isComplete) cls.push('complete');

  return (
    <div className={cls.join(' ')} ref={cardRef}>
      <div className="today-head">
        <div className="today-heading">
          <span className="today-icon">{notice.icon}</span>
          <span className="today-title">今日概览</span>
        </div>
        <span className="today-time">{hhmm}</span>
      </div>
      <div className="today-sum">
        <b>{doneN}</b> / <b>{total}</b> 项已完成
        {total > 0 && <span className="pct"> · {pct}%</span>}
      </div>
      <div className="today-segs" ref={segsRef} onMouseOver={(e) => {
        const seg = (e.target as HTMLElement).closest<HTMLButtonElement>('.today-seg');
        if (seg) showTip(seg);
      }} onMouseOut={(e) => {
        if ((e.target as HTMLElement).closest('.today-seg')) hideTip();
      }} onFocusCapture={(e) => {
        const seg = (e.target as HTMLElement).closest<HTMLButtonElement>('.today-seg');
        if (seg) showTip(seg);
      }} onBlurCapture={hideTip}>
        {ordered.map((t, i) => {
          const stateCls = !t.done ? '' : isComplete ? ' all-done' : warn ? ' alert-done' : ' done';
          const nextCls = !t.done && i === doneN && !isComplete ? ' next' : '';
          const tipText = `${t.title.split('\n')[0]}${t.done ? '（已完成）' : '（未完成）'}`;
          return (
            <button
              key={t.id}
              type="button"
              className={`today-seg${stateCls}${nextCls}`}
              data-id={t.id}
              data-tip={tipText}
              title={tipText}
              onClick={() => locate(t)}
            />
          );
        })}
      </div>
      <div className="today-tip" ref={tipRef} />
      <div className="today-notice" role="status">
        <span className="today-notice-icon">{notice.nIcon}</span>
        <div>
          <div className="today-notice-title">{notice.title}</div>
          <div className="today-notice-copy">{notice.copy}</div>
        </div>
      </div>
      {total === 0 && <div className="today-empty">今天还没有安排</div>}
      {total > 0 && <div className="today-foot">点按进度段，定位并高亮对应任务</div>}
    </div>
  );
}
