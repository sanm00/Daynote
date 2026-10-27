import { defaultTags, validateTags } from '@/lib/tags';
import type { SliceCreator, TagSlice } from './types';

export const createTagSlice: SliceCreator<TagSlice> = (set) => ({
  tags: defaultTags(),
  saveTag: (patch, id) => set(s => {
    const tag = { ...patch, id: id ?? `tag-${crypto.randomUUID()}` };
    if (id && !s.tags.some(t => t.id === id)) throw new Error('标签不存在');
    const tags = validateTags(id ? s.tags.map(t => t.id === id ? tag : t) : [...s.tags, tag]);
    return { tags };
  }),
  deleteTag: (id, replacement) => set(s => {
    if (!s.tags.some(t => t.id === id)) return {};
    if (id === replacement || !s.tags.some(t => t.id === replacement) || s.tags.length < 2) throw new Error('至少保留一个标签，请选择替代标签');
    const move = <T extends {tag: string}>(row: T): T => row.tag === id ? { ...row, tag: replacement } : row;
    return {
      tags: s.tags.filter(t => t.id !== id),
      tasks: s.tasks.map(move), notes: s.notes.map(move),
      noteDraft: s.noteDraft ? move(s.noteDraft) : null,
      settings: s.settings.defaultTag === id ? { ...s.settings, defaultTag: replacement } : s.settings,
      addTag: s.addTag === id ? replacement : s.addTag,
      noteFilter: s.noteFilter === id ? 'all' : s.noteFilter,
    };
  }),
  moveTag: (id, direction) => set(s => {
    const index = s.tags.findIndex(t => t.id === id), target = index + direction;
    if (index < 0 || target < 0 || target >= s.tags.length) return {};
    const tags = [...s.tags];
    [tags[index], tags[target]] = [tags[target], tags[index]];
    return { tags };
  }),
  setTaskTag: (id, tag) => set(s => s.tags.some(t => t.id === tag) ? { tasks: s.tasks.map(t => t.id === id ? { ...t, tag } : t) } : {}),
});
