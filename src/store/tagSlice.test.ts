import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@/store';
import { defaultTags } from '@/lib/tags';
import { storage } from '@/lib/storage';
import { setupAutoPersist } from '@/store/autosave';

const note = { id:1, title:'笔记', content:'已保存', tag:'工作', createdAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z' };
const task = { id:1, title:'任务', tag:'工作', prio:'mid' as const, beginDate:null, endDate:null, done:false, doneAt:null };
const state = () => useAppStore.getState();
beforeEach(() => useAppStore.setState({tags:defaultTags(), settings:{theme:'light', defaultTag:'工作'}, tasks:[task], notes:[note], noteDraft:null, currentNoteId:1, addTag:'工作', noteFilter:'all'}));
afterEach(() => {vi.restoreAllMocks();vi.useRealTimers();});

describe('custom tags', () => {
  it('renames and recolors without changing record IDs or statistics keys', () => {
    state().saveTag({name:'项目',color:'blue'},'工作');
    expect(state().tags[0]).toEqual({id:'工作',name:'项目',color:'blue'});
    expect(state().tasks[0].tag).toBe('工作');
    expect(state().notes[0].tag).toBe('工作');
    expect(state().settings.defaultTag).toBe('工作');
  });
  it('validates names before changing state and keeps order after adding', () => {
    expect(() => state().saveTag({name:' 工作 ',color:'work'})).toThrow('重复');
    expect(() => state().saveTag({name:' ',color:'work'})).toThrow();
    state().saveTag({name:'旅行',color:'cyan'});
    const id = state().tags[4].id;
    state().moveTag(id,-1);
    expect(state().tags[3].name).toBe('旅行');
    expect(state().tags[4].id).toBe('健康');
  });
  it('migrates tasks, saved notes, unsaved draft and default/filter references on delete', () => {
    useAppStore.setState({noteDraft:{...note,content:'尚未保存的编辑'},noteFilter:'工作'});
    state().deleteTag('工作','学习');
    expect(state().tasks[0].tag).toBe('学习');
    expect(state().notes[0].tag).toBe('学习');
    expect(state().noteDraft).toMatchObject({tag:'学习',content:'尚未保存的编辑'});
    expect(state().settings.defaultTag).toBe('学习');
    expect(state().addTag).toBe('学习');
    expect(state().noteFilter).toBe('all');
    expect(state().tags.some(t=>t.id === '工作')).toBe(false);
  });
  it('rejects deletion without a valid replacement and protects the last tag', () => {
    expect(() => state().deleteTag('工作','工作')).toThrow();
    useAppStore.setState({tags:[defaultTags()[0]]});
    expect(() => state().deleteTag('工作','学习')).toThrow();
    expect(state().tags).toHaveLength(1);
  });
  it('uses the chosen default for both new tasks and note drafts', () => {
    state().saveTag({name:'旅行',color:'blue'});
    const id = state().tags[4].id;
    state().setDefaultTag(id);state().submitQuickAdd('订机票');state().newNoteDraft();
    expect(state().tasks.at(-1)?.tag).toBe(id);
    expect(state().noteDraft?.tag).toBe(id);
  });
  it('roundtrips custom IDs through persistence, hydration and backup import', async () => {
    state().saveTag({name:'旅行',color:'blue'});
    const id = state().tags[4].id;
    state().setTaskTag(1,id);state().setDefaultTag(id);
    const save = vi.spyOn(storage,'save').mockResolvedValue();
    await state().persistNow();
    const data = save.mock.calls[0][0];
    useAppStore.setState({tags:defaultTags(),tasks:[],notes:[]});
    vi.spyOn(storage,'load').mockResolvedValue(data);vi.spyOn(storage,'root').mockResolvedValue(null);
    await state().hydrateFromStorage();
    expect(state().tags).toEqual(data.tags);
    expect(state().tasks[0].tag).toBe(id);
    state().importData(data);
    expect(state().tasks[0].tag).toBe(id);
    expect(state().settings.defaultTag).toBe(id);
  });
  it('rejects dangling IDs atomically, including partial imports that would orphan existing notes', () => {
    const before = state();
    expect(() => state().importData({tags:[{id:'tag-other',name:'其他',color:'blue'}],tasks:[]})).toThrow('完整备份');
    expect(state().tags).toBe(before.tags);
    expect(() => state().importData({tags:defaultTags(),tasks:[{...task,tag:'missing'}],notes:[]})).toThrow('不存在');
    expect(state().tasks).toBe(before.tasks);
  });
  it('automatically saves tag-only edits', async () => {
    vi.useFakeTimers();
    const save = vi.spyOn(storage,'save').mockResolvedValue();
    const unsubscribe = setupAutoPersist();
    state().saveTag({name:'项目',color:'blue'},'工作');
    await vi.advanceTimersByTimeAsync(350);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({tags:expect.arrayContaining([{id:'工作',name:'项目',color:'blue'}])}));
    unsubscribe();
  });
});
