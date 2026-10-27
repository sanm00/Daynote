import { useAppStore } from '@/store';
import { TagName } from '@/components/Tags';
import type { TagEntry } from '@/lib/stats';

interface Props {
  tagEntries: TagEntry[];
}

export function TagDistribution({ tagEntries }: Props) {
  const tags = useAppStore(s => s.tags);
  const tagMax = Math.max(1, ...tagEntries.map((x) => x[1]));
  return (
    <div className="card tag-card">
      <div className="card-title-row">
        <div className="card-title">标签分布</div>
      </div>
      <div>
        {tagEntries.length ? (
          tagEntries.map(([tag, n]) => (
            <div className="tag-stat" key={tag}>
              <div className="tag-stat-head">
                <span><TagName id={tag} /></span>
                <b>{n} 项</b>
              </div>
              <div className="tag-bar">
                <i
                  style={{
                    width: `${Math.round((n / tagMax) * 100)}%`,
                    background: `var(--tag-${tags.find(t => t.id === tag)?.color ?? 'work'})`,
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
  );
}
