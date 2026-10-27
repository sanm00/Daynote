import { useCallback, useState } from 'react';
import { useAppStore } from '@/store';
import { TagDropdown } from './TagDropdown';

/** Select an existing tag; tag management belongs in Settings. */
export function TagSelect({ value, onSelect, label }: {
  value: string; onSelect: (id: string) => void; label: string;
}) {
  const selected = useAppStore(s => s.tags.find(tag => tag.id === value));
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  return <div className="tag-select">
    <button type="button" className="tag tag-trigger tag-select-trigger" data-tag={value} aria-label={label} aria-expanded={!!anchor}
      style={{background:`var(--tag-${selected?.color ?? 'work'}-bg)`,color:`var(--tag-${selected?.color ?? 'work'}-fg)`}}
      title={selected?.name} onClick={e => {const target = e.currentTarget;setAnchor(current => current ? null : target);}}>
      <span className="add-tag-label">{selected?.name}</span>
      <svg className="caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>
    {anchor && <TagDropdown anchor={anchor} value={value} onSelect={onSelect} onClose={close} />}
  </div>;
}
