import type { Stats } from '@/lib/stats';

interface Props {
  stats: Stats;
  trendCls: string;
  trendTxt: string;
}

export function StatCards({ stats, trendCls, trendTxt }: Props) {
  return (
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
  );
}
