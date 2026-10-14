import { useEffect, useRef, useState } from 'react';
import { mdLabel, type Chart } from '@/lib/stats';

interface Props {
  chart: Chart;
  chartType: 'bar' | 'line';
  onChartType: (t: 'bar' | 'line') => void;
  subtitle: string;
}

/** Daily completion chart with a bar/line toggle and a hover tooltip. */
export function TrendChart({ chart, chartType, onChartType, subtitle }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [lineSize, setLineSize] = useState({ w: 0, h: 0 });

  // Line-chart geometry needs the measured box size.
  useEffect(() => {
    if (chartType !== 'line' || !chartRef.current) return;
    const el = chartRef.current;
    const measure = () => setLineSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chartType, chart.buckets.length]);

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
    const linePath = pts
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');
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
            onClick={() => onChartType('bar')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M5 20V10M12 20V4M19 20v-7" />
            </svg>
          </button>
          <button
            className={`chart-toggle-btn${chartType === 'line' ? ' active' : ''}`}
            title="折线图"
            onClick={() => onChartType('line')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 16l5-5 4 3 6-7" />
            </svg>
          </button>
        </div>
      </div>
      <div
        className="chart"
        ref={chartRef}
        onMouseMove={onChartMove}
        onMouseLeave={() => setTip(null)}
      >
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
  );
}
