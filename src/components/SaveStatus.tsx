import { useAppStore } from '@/store';
import { relTime } from '@/lib/date';

interface Props {
  updatedAt: string;
  /** Whether the note has unsaved edits. */
  dirty: boolean;
  /** Commit the pending edits to disk. */
  onSave: () => void;
}

/** Save indicator for the note editor. Notes are not auto-saved: while there
 * are edits it reads "未保存" and offers an explicit save button (also ⌘S). */
export function SaveStatus({ updatedAt, dirty, onSave }: Props) {
  const saveState = useAppStore((s) => s.saveState);
  const cls = dirty ? 'dirty' : saveState === 'saving' ? 'saving' : saveState === 'error' ? 'error' : 'saved';
  const text = dirty
    ? '未保存'
    : saveState === 'saving'
      ? '保存中…'
      : saveState === 'error'
        ? '保存失败'
        : `已保存 · ${relTime(updatedAt)}`;

  return (
    <span className={`save-status ${cls}`}>
      <i className="save-dot" />
      {text}
      {dirty && (
        <button type="button" className="save-now" title="保存（⌘S）" onClick={onSave}>
          保存
        </button>
      )}
    </span>
  );
}
