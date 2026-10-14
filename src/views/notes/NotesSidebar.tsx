import { useAppStore } from '@/store';
import { relTime } from '@/lib/date';
import { TAG_ORDER } from '@/lib/tags';
import { plainText } from '@/lib/markdown';
import type { Note } from '@/types';

const NOTE_ICON = (
  <>
    <path d="M5 3.5h11l3.5 3.5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </>
);

interface Props {
  list: Note[];
  onSelect: (id: number) => void;
  onCreate: () => void;
}

export function NotesSidebar({ list, onSelect, onCreate }: Props) {
  const currentNoteId = useAppStore((s) => s.currentNoteId);
  const noteFilter = useAppStore((s) => s.noteFilter);
  const setNoteFilter = useAppStore((s) => s.setNoteFilter);

  return (
    <aside className="notes-side">
      <div className="notes-side-head">
        <button className="btn primary" title="新建笔记（⌘N）" onClick={onCreate}>
          + 新建笔记
          <span className="btn-hint">⌘N</span>
        </button>
      </div>
      <div className="notes-filter" id="noteFilter">
        <button
          className={`filter-chip${noteFilter === 'all' ? ' active' : ''}`}
          data-filter="all"
          onClick={() => setNoteFilter('all')}
        >
          全部
        </button>
        {TAG_ORDER.map((tag) => (
          <button
            key={tag}
            className={`filter-chip${noteFilter === tag ? ' selected active' : ''}`}
            data-filter={tag}
            onClick={() => setNoteFilter(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="notes-list">
        {!list.length ? (
          <div className="empty-tip" style={{ padding: '28px 0' }}>
            <svg viewBox="0 0 24 24">{NOTE_ICON}</svg>
            <span>没有符合条件的笔记</span>
          </div>
        ) : (
          list.map((n) => (
            <div
              key={n.id}
              className={`note-item${n.id === currentNoteId ? ' active' : ''}`}
              onClick={() => onSelect(n.id)}
            >
              <div className="note-item-title">{n.title || '无标题'}</div>
              <div className="note-item-snippet">{plainText(n.content).slice(0, 60) || '暂无内容'}</div>
              <div className="note-item-foot">
                <span className="tag" data-tag={n.tag}>
                  {n.tag}
                </span>
                <span className="note-item-time">{relTime(n.updatedAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export { NOTE_ICON };
