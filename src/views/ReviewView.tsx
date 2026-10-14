import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { addDays, dayNames, dayOf, fmt, hmOf, parseDate, today, todayStr } from '@/lib/date';
import { TAG_STYLE } from '@/lib/tags';
import type { ReviewRange, Task } from '@/types';

interface Range {
  start: Date;
  end: Date;
}

function getRange(key: ReviewRange): Range {
  const t = new Date(today());
  const dow = (t.getDay() + 6) % 7;
  const mon = addDays(t, -dow);
  switch (key) {
    case 'today':
      return { start: t, end: t };
    case 'yesterday': {
      const d = addDays(t, -1);
      return { start: d, end: d };
    }
    case 'week':
      return { start: mon, end: t };
    case 'lastweek':
      return { start: addDays(mon, -7), end: addDays(mon, -1) };
    case 'month':
      return { start: new Date(t.getFullYear(), t.getMonth(), 1), end: t };
    case 'lastmonth':
      return {
        start: new Date(t.getFullYear(), t.getMonth() - 1, 1),
        end: new Date(t.getFullYear(), t.getMonth(), 0),
      };
  }
}

function rangeLabel(r: Range): string {
  if (fmt(r.start) === fmt(r.end)) {
    return `${r.start.getFullYear()}年${r.start.getMonth() + 1}月${r.start.getDate()}日 ${dayNames[r.start.getDay()]}`;
  }
  const sameYear = r.start.getFullYear() === r.end.getFullYear();
  const left = `${sameYear ? '' : r.start.getFullYear() + '年'}${r.start.getMonth() + 1}月${r.start.getDate()}日`;
  return `${left} — ${r.end.getMonth() + 1}月${r.end.getDate()}日`;
}

const mdLabel = (ds: string) => {
  const d = parseDate(ds);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${dayNames[d.getDay()]}`;
};

interface Bucket {
  ds: string;
  label: string;
  value: number;
  weekend: boolean;
  today: boolean;
  selected: boolean;
}

export function ReviewView() {
  const tasks = useAppStore((s) => s.tasks);
  const notes = useAppStore((s) => s.notes);
  const reviewRange = useAppStore((s) => s.reviewRange);
  const chartType = useAppStore((s) => s.chartType);
  const setReviewRange = useAppStore((s) => s.setReviewRange);
  const setChartType = useAppStore((s) => s.setChartType);

  const r = useMemo(() => getRange(reviewRange), [reviewRange]);

  const stats = useMemo(() => {
    const s = fmt(r.start);
    const e = fmt(r.end);
    const unscheduledCount = tasks.filter((t) => t.date === null).length;
    const doneTasks = tasks.filter(
      (t) => t.done && t.doneAt !== null && dayOf(t.doneAt)! >= s && dayOf(t.doneAt)! <= e,
    );
    const doneN = doneTasks.length;
    const inRange = tasks.filter((t) => t.date !== null && t.date! >= s && t.date! <= e);
    const total = inRange.length;
    const scheduledDoneN = inRange.filter((t) => t.done).length;
    const rate = total ? Math.round((scheduledDoneN / total) * 100) : 0;
    const undoneN = total - scheduledDoneN;
    const activeDays = new Set(doneTasks.map((t) => dayOf(t.doneAt))).size;
    const dayCount = Math.round((r.end.getTime() - r.start.getTime()) / 86400000) + 1;

    const lateDone = (t: Task) =>
      t.done && t.doneAt && t.date !== null && dayOf(t.doneAt)! > t.date!;
    const overdueUndone = inRange.filter((t) => !t.done && t.date! < todayStr());
    const overdueDone = inRange.filter(lateDone);
    const overdueN = overdueUndone.length + overdueDone.length;

    const prevStart = addDays(r.start, -dayCount);
    const prevEnd = addDays(r.start, -1);
    const ps = fmt(prevStart);
    const pe = fmt(prevEnd);
    const prevInRange = tasks.filter((t) => t.date !== null && t.date! >= ps && t.date! <= pe);
    const hasPrev = prevInRange.length > 0;
    const prevRate = hasPrev
      ? Math.round((prevInRange.filter((t) => t.done).length / prevInRange.length) * 100)
      : 0;
    const delta = rate - prevRate;

    const inDay = (ds: string) => ds >= s && ds <= e;
    const notesNew = notes.filter((n) => inDay(fmt(new Date(n.createdAt)))).length;
    const notesEdited = notes.filter((n) => {
      const c = fmt(new Date(n.createdAt));
      const u = fmt(new Date(n.updatedAt));
      return u >= s && u <= e && c !== u;
    }).length;

    return {
      doneTasks,
      doneN,
      unscheduledCount,
      total,
      rate,
      undoneN,
      activeDays,
      dayCount,
      overdueN,
      overdueDoneN: overdueDone.length,
      overdueUndoneN: overdueUndone.length,
      hasPrev,
      delta,
      notesNew,
      notesEdited,
    };
  }, [tasks, notes, r]);

  // ---- chart buckets ----
  const chart = useMemo(() => {
    const single = fmt(r.start) === fmt(r.end);
    let chartStart = r.start;
    let chartEnd = r.end;
    let selectedDs: string | null = null;
    if (single) {
      const dow = (r.start.getDay() + 6) % 7;
      chartStart = addDays(r.start, -dow);
      chartEnd = addDays(chartStart, 6);
      selectedDs = fmt(r.start);
    }
    const days: Date[] = [];
    for (let d = new Date(chartStart); d <= chartEnd; d = addDays(d, 1)) days.push(new Date(d));
    const buckets: Bucket[] = days.map((d) => {
      const ds = fmt(d);
      return {
        ds,
        label: `${d.getDate()}`,
        value: stats.doneTasks.filter((t) => dayOf(t.doneAt) === ds).length,
        weekend: d.getDay() === 0 || d.getDay() === 6,
        today: ds === todayStr(),
        selected: ds === selectedDs,
      };
    });
    return {
      single,
      chartStart,
      chartEnd,
      buckets,
      max: Math.max(1, ...buckets.map((b) => b.value)),
    };
  }, [r, stats.doneTasks]);

  // ---- tooltip ----
  const chartRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  const onChartMove = (e: React.MouseEvent) => {
    const hit = (e.target as HTMLElement).closest('[data-tip]');
    const host = chartRef.current;
    if (!hit || !host) {
      setTip(null);
      return;
    }
    const rect = host.getBoundingClientRect();
    setTip({
      text: hit.getAttribute('data-tip')!,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 6,
    });
  };

  // ---- line chart geometry (needs measured size) ----
  const [lineSize, setLineSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (chartType !== 'line' || !chartRef.current) return;
    const el = chartRef.current;
    const measure = () => setLineSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chartType, chart.buckets.length]);

  const subtitle = chart.single
    ? `所在周 · ${rangeLabel({ start: chart.chartStart, end: chart.chartEnd })}`
    : rangeLabel(r);

  const tagEntries = useMemo(() => {
    const counts = new Map<string, number>();
    stats.doneTasks.forEach((t) => counts.set(t.tag, (counts.get(t.tag) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [stats.doneTasks]);
  const tagMax = Math.max(1, ...tagEntries.map((x) => x[1]));

  const logGroups = useMemo(() => {
    const byDate = new Map<string, Task[]>();
    stats.doneTasks.forEach((t) => {
      const d = dayOf(t.doneAt)!;
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(t);
    });
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ds, items]) => ({
        ds,
        items: items.sort((a, b) => (a.doneAt || '').localeCompare(b.doneAt || '')),
      }));
  }, [stats.doneTasks]);

  const trendCls = stats.delta > 0 ? 'up' : stats.delta < 0 ? 'down' : 'flat';
  const trendTxt = stats.delta > 0 ? `+${stats.delta}%` : `${stats.delta}%`;

  const step = Math.ceil(chart.buckets.length / 14);

  const renderLine = () => {
    const W = Math.max(lineSize.w, 240);
    const H = Math.max(lineSize.h, 120);
    const padT = 18;
    const padB = 22;
    const padL = 16;
    const padR = 16;
    const n = chart.buckets.length;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const baseY = padT + innerH;
    const xAt = (i: number) => (n === 1 ? W / 2 : padL + (innerW * i) / (n - 1));
    const yAt = (v: number) => padT + innerH * (1 - v / chart.max);
    const pts = chart.buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.value), b }));
    const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(2)},${baseY.toFixed(2)} L${pts[0].x.toFixed(2)},${baseY.toFixed(2)} Z`;

    return (
      <svg className="line-svg" viewBox={`0 0 ${W} ${H}`}>
        <line className="line-axis" x1={padL} y1={padT} x2={W - padR} y2={padT} />
        <line className="line-axis" x1={padL} y1={baseY} x2={W - padR} y2={baseY} />
        {pts
          .filter((p) => p.b.selected)
          .map((p) => (
            <line
              key={`g-${p.b.ds}`}
              className="line-guide"
              x1={p.x.toFixed(2)}
              y1={padT}
              x2={p.x.toFixed(2)}
              y2={baseY.toFixed(2)}
            />
          ))}
        <path className="line-area" d={areaPath} />
        <path className="line-path" d={linePath} />
        {pts.map((p) => (
          <g key={p.b.ds}>
            <circle
              className={`line-dot${p.b.selected ? ' selected' : ''}`}
              cx={p.x.toFixed(2)}
              cy={p.y.toFixed(2)}
              r={p.b.selected ? 3.6 : 2.6}
            />
            <circle
              className="line-hit"
              cx={p.x.toFixed(2)}
              cy={p.y.toFixed(2)}
              r="11"
              data-tip={`${mdLabel(p.b.ds)} · 完成 ${p.b.value} 项`}
            />
          </g>
        ))}
        {pts.map((p, i) => {
          const b = p.b;
          if (!(b.value > 0 || n <= 16 || i % step === 0)) return null;
          return (
            <text
              key={`v-${b.ds}`}
              className={`line-val${b.selected ? ' selected' : ''}`}
              x={p.x.toFixed(2)}
              y={(p.y - 7).toFixed(2)}
            >
              {b.value || ''}
            </text>
          );
        })}
        {chart.buckets.map((b, i) => {
          if (!(n <= 16 || i % step === 0 || b.selected || b.today)) return null;
          const cls = ['line-xlab', b.weekend && 'weekend', b.selected && 'selected', b.today && 'today']
            .filter(Boolean)
            .join(' ');
          return (
            <text key={`x-${b.ds}`} className={cls} x={xAt(i).toFixed(2)} y={H - 6}>
              {b.label}
            </text>
          );
        })}
      </svg>
    );
  };

  return (
    <section className="page active" id="page-review">
      <div className="review-head">
        <div className="tabs" id="reviewTabs">
          {(
            [
              ['today', '今天'],
              ['yesterday', '昨天'],
              ['week', '本周'],
              ['lastweek', '上周'],
              ['month', '当月'],
              ['lastmonth', '上月'],
            ] as Array<[ReviewRange, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              className={`tab${reviewRange === key ? ' active' : ''}`}
              onClick={() => setReviewRange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="range-label">{rangeLabel(r)}</div>
      </div>

      <div className="review-scroll">
        <div className="stats-grid">
          <div className="card stat">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            </div>
            <div>
              <div className="stat-label">完成任务</div>
              <div className="stat-value">
                {stats.doneN}
                <small>项</small>
              </div>
              <div className="stat-sub">
                {stats.unscheduledCount
                  ? `共安排 ${stats.total} 项 · 另有 ${stats.unscheduledCount} 项待排期`
                  : `共安排 ${stats.total} 项`}
              </div>
            </div>
          </div>

          <div className="card stat">
            <div className="ring" style={{ ['--p' as string]: stats.rate }}>
              <span>{stats.rate}%</span>
            </div>
            <div>
              <div className="stat-label">完成率</div>
              <div className="stat-value">
                {stats.rate}
                <small>%</small>
              </div>
              <div className="stat-sub">
                {stats.hasPrev ? (
                  <>
                    较上一周期 <span className={`stat-trend ${trendCls}`}>{trendTxt}</span>
                  </>
                ) : (
                  `${stats.undoneN} 项未完成`
                )}
              </div>
            </div>
          </div>

          <div className={`card stat${stats.overdueN ? ' warn' : ''}`}>
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 8v4.5l3 1.8" />
              </svg>
            </div>
            <div>
              <div className="stat-label">逾期任务</div>
              <div className="stat-value">
                {stats.overdueN}
                <small>项</small>
              </div>
              <div className="stat-sub">
                {stats.overdueN
                  ? `逾期完成 ${stats.overdueDoneN} · 未完成 ${stats.overdueUndoneN}`
                  : '暂无逾期'}
              </div>
            </div>
          </div>

          <div className="card stat">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M3 21h18" />
                <path d="M6 21V11M11 21V5M16 21v-6M21 21v-9" />
              </svg>
            </div>
            <div>
              <div className="stat-label">有产出的天数</div>
              <div className="stat-value">
                {stats.activeDays}
                <small>天</small>
              </div>
              <div className="stat-sub">区间共 {stats.dayCount} 天</div>
            </div>
          </div>

          <div className="card stat">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
                <path d="M8 9h8M8 13h8M8 17h5" />
              </svg>
            </div>
            <div>
              <div className="stat-label">新增笔记</div>
              <div className="stat-value">
                {stats.notesNew}
                <small>篇</small>
              </div>
              <div className="stat-sub">
                {stats.notesEdited ? `另编辑 ${stats.notesEdited} 篇过往笔记` : '区间内无过往笔记编辑'}
              </div>
            </div>
          </div>
        </div>

        <div className="charts-row">
          <div className="card chart-card">
            <div className="card-title-row">
              <div>
                <div className="card-title">每日完成情况</div>
                <div className="chart-subtitle">{subtitle}</div>
              </div>
              <div className="chart-toggle" data-type={chartType}>
                <span className="chart-toggle-thumb" />
                <button
                  className={`chart-toggle-btn${chartType === 'bar' ? ' active' : ''}`}
                  title="柱状图"
                  onClick={() => setChartType('bar')}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M5 20V10M12 20V4M19 20v-7" />
                  </svg>
                </button>
                <button
                  className={`chart-toggle-btn${chartType === 'line' ? ' active' : ''}`}
                  title="折线图"
                  onClick={() => setChartType('line')}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M4 16l5-5 4 3 6-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="chart" ref={chartRef} onMouseMove={onChartMove} onMouseLeave={() => setTip(null)}>
              {chartType === 'line' ? (
                renderLine()
              ) : (
                <div className="bars">
                  {chart.buckets.map((b, i) => {
                    const pct = Math.round((b.value / chart.max) * 100);
                    const showLabel = b.value > 0 || chart.buckets.length <= 16 || i % step === 0;
                    const cls = ['bar-col', b.weekend && 'weekend', b.selected && 'selected', b.today && 'today']
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <div key={b.ds} className={cls} data-tip={`${mdLabel(b.ds)} · 完成 ${b.value} 项`}>
                        <div className="bar-val">{b.value || ''}</div>
                        <div className="bar-track">
                          <div
                            className={`bar${b.value ? '' : ' zero'}`}
                            style={{ height: b.value ? `${Math.max(pct, 5)}%` : 0 }}
                          />
                        </div>
                        <div className="bar-label">{showLabel ? b.label : ''}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div
                className={`chart-tip${tip ? ' show' : ''}`}
                ref={tipRef}
                style={tip ? { left: tip.x, top: tip.y } : undefined}
              >
                {tip?.text ?? ''}
              </div>
            </div>
          </div>

          <div className="card tag-card">
            <div className="card-title-row">
              <div className="card-title">标签分布</div>
            </div>
            <div>
              {tagEntries.length ? (
                tagEntries.map(([tag, n]) => (
                  <div className="tag-stat" key={tag}>
                    <div className="tag-stat-head">
                      <span>{tag}</span>
                      <b>{n} 项</b>
                    </div>
                    <div className="tag-bar">
                      <i
                        style={{
                          width: `${Math.round((n / tagMax) * 100)}%`,
                          background: TAG_STYLE[tag as keyof typeof TAG_STYLE]?.bar ?? 'var(--muted-2)',
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-tip">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 21h18M6 21V11M11 21V5M16 21v-6M21 21v-9" />
                  </svg>
                  <span>暂无完成记录</span>
                </div>
              )}
            </div>
          </div>
        </div>

          <div className="card log-card">
            <div className="card-title-row">
              <div className="card-title">完成记录</div>
            </div>
            <div id="logList">
            {logGroups.length ? (
              logGroups.map(({ ds, items }) => {
                const d = parseDate(ds);
                return (
                  <div className="log-group" key={ds}>
                    <div className="log-date">
                      {d.getMonth() + 1}月{d.getDate()}日 {dayNames[d.getDay()]}
                      <span>{items.length} 项</span>
                    </div>
                    <div className="log-items">
                      {items.map((t) => (
                        <div className="log-item" key={t.id}>
                          <i className="log-dot" />
                          <span className="log-title">{t.title}</span>
                          <span className="tag" data-tag={t.tag}>
                            {t.tag}
                          </span>
                          <span className="log-time">{hmOf(t.doneAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-tip">
                <svg viewBox="0 0 24 24">
                  <path d="M9 11.5l2 2 4-4.5" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                <span>还没有完成记录</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
