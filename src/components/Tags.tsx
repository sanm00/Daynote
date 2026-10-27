import { useAppStore } from '@/store';

export function TagName({ id }: { id: string }) {
  const name = useAppStore(s => s.tags.find(t => t.id === id)?.name ?? id);
  return <>{name}</>;
}

export function TagStyles() {
  const tags = useAppStore(s => s.tags);
  return <style>{tags.map(t => `.tag[data-tag="${t.id}"],.filter-chip[data-filter="${t.id}"],.note-tag-chip.active[data-tag="${t.id}"]{background:var(--tag-${t.color}-bg);color:var(--tag-${t.color}-fg)}`).join('\n')}</style>;
}
