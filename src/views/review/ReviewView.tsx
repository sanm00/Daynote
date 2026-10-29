import { useMemo } from 'react';
import { useAppStore } from '@/store';
import {
  computeChart,
  computeLogGroups,
  computeRemaining,
  computeStats,
  computeTagEntries,
  countOverdue,
  getRange,
  rangeLabel,
} from '@/lib/stats';
import type { ReviewRange } from '@/types';
import { StatCards } from './StatCards';
import { TrendChart } from './TrendChart';
import { TagDistribution } from './TagDistribution';
import { CompletionLog } from './CompletionLog';

const RANGES: Array<[ReviewRange, string]> = [
  ['today', '今天'],
  ['yesterday', '昨天'],
  ['week', '本周'],
  ['lastweek', '上周'],
  ['month', '当月'],
  ['lastmonth', '上月'],
];

export function ReviewView() {
  const tasks = useAppStore((s) => s.tasks);
  const notes = useAppStore((s) => s.notes);
  const reviewRange = useAppStore((s) => s.reviewRange);
  const chartType = useAppStore((s) => s.chartType);
  const setReviewRange = useAppStore((s) => s.setReviewRange);
  const setChartType = useAppStore((s) => s.setChartType);

  const r = useMemo(() => getRange(reviewRange), [reviewRange]);
  const stats = useMemo(
    () => computeStats(tasks, notes, r, reviewRange),
    [tasks, notes, r, reviewRange],
  );
  const chart = useMemo(() => computeChart(r, tasks), [r, tasks]);
  const tagEntries = useMemo(() => computeTagEntries(stats.doneTasks), [stats.doneTasks]);
  const logGroups = useMemo(() => computeLogGroups(stats.doneTasks), [stats.doneTasks]);
  const remaining = useMemo(() => computeRemaining(tasks, r), [tasks, r]);
  const overdueCount = useMemo(() => countOverdue(remaining), [remaining]);

  const subtitle = rangeLabel(r);
  const trendCls = stats.delta > 0 ? 'up' : stats.delta < 0 ? 'down' : 'flat';
  const trendTxt = `${stats.delta > 0 ? '+' : ''}${stats.delta} 个百分点`;

  return (
    <section className="page active" id="page-review">
      <div className="review-head">
        <div className="tabs" id="reviewTabs">
          {RANGES.map(([key, label]) => (
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
        <StatCards stats={stats} trendCls={trendCls} trendTxt={trendTxt} />
        <p className="review-basis">
          完成任务按实际完成日统计；计划数按排期与周期有重叠计（含跨天与未来）；完成率 =
          周期内完成 {stats.doneN} / 周期内计划 {stats.total}。
        </p>
        <div className="charts-row">
          <TrendChart
            chart={chart}
            chartType={chartType}
            onChartType={setChartType}
            subtitle={subtitle}
          />
          <TagDistribution tagEntries={tagEntries} />
        </div>
        <CompletionLog logGroups={logGroups} remaining={remaining} overdueCount={overdueCount} />
      </div>
    </section>
  );
}
