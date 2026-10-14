import { hmOf } from '@/lib/date';
import { mdLabel, type LogGroup } from '@/lib/stats';

interface Props {
  logGroups: LogGroup[];
}

export function CompletionLog({ logGroups }: Props) {
  return (
    <div className="card log-card">
      <div className="card-title-row">
        <div className="card-title">完成记录</div>
      </div>
      <div id="logList">
        {logGroups.length ? (
          logGroups.map(({ ds, items }) => (
            <div className="log-group" key={ds}>
              <div className="log-date">
                {mdLabel(ds)}
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
          ))
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
  );
}
