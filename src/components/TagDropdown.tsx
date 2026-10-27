import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store';

export function TagDropdown({ anchor, value, onSelect, onClose }: {
  anchor: HTMLElement; value: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const tags = useAppStore(s => s.tags);
  const ref = useRef<HTMLDivElement>(null);
  const rect = anchor.getBoundingClientRect();
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    const outside = (e: PointerEvent) => {if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();};
    const reposition = () => onClose();
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition);
    return () => {document.removeEventListener('pointerdown', outside);window.removeEventListener('resize', reposition);};
  }, [anchor, onClose]);
  return createPortal(<div ref={ref} className="tag-menu open custom-tag-picker" role="group" aria-label="选择标签"
    style={{ left:Math.max(8,Math.min(rect.left,window.innerWidth - 328)), top:Math.max(8,Math.min(rect.bottom + 6,window.innerHeight - 340)) }}
    onKeyDown={e => {if (e.key === 'Escape') {e.stopPropagation();onClose();anchor.focus();}}}>
    <div className="custom-tag-options">{tags.map(tag => <button type="button" key={tag.id} className={value === tag.id ? 'active' : ''} aria-pressed={value === tag.id}
      onClick={() => {onSelect(tag.id);onClose();anchor.focus();}}><i style={{ background:`var(--tag-${tag.color})` }} />{tag.name}{value === tag.id && ' ✓'}</button>)}</div>
  </div>, document.body);
}
