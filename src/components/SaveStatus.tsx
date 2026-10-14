import { useAppStore } from '@/store';
import { relTime } from '@/lib/date';

interface Props {
  updatedAt: string;
}

/** Small save indicator for the note editor. Shows a live "saving" state while
 * the debounced write is in flight, an error state on failure, and a fixed
 * timestamp (the note's own last-saved time) otherwise. */
export function SaveStatus({ updatedAt }: Props) {
  const saveState = useAppStore((s) => s.saveState);
  const cls = saveState === 'saving' ? 'saving' : saveState === 'error' ? 'error' : 'saved';
  const text =
    saveState === 'saving'
      ? '保存中…'
      : saveState === 'error'
        ? '保存失败'
        : `已保存 · ${relTime(updatedAt)}`;

  return (
    <span className={`save-status ${cls}`}>
      <i className="save-dot" />
      {text}
    </span>
  );
}
