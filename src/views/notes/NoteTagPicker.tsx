import { TagSelect } from '@/components/TagSelect';

export function NoteTagPicker({ value, noteId, onSelect }: {value: string; noteId: number; onSelect: (tag: string) => void}) {
  return <div className="note-tags">
    <TagSelect key={noteId} value={value} onSelect={onSelect} label="选择笔记标签" />
  </div>;
}
