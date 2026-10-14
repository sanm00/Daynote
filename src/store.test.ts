import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './store';

function resetStore() {
  useAppStore.setState({
    tasks: [],
    notes: [],
    settings: { theme: 'light', defaultTag: '工作' },
    addTag: '工作',
    currentNoteId: null,
    noteFilter: 'all',
    noteMode: 'preview',
    findOpen: false,
    planView: { kind: 'date' },
    reschedulingId: null,
  });
}

describe('importData', () => {
  beforeEach(resetStore);

  it('drops malformed task rows and coerces fields', () => {
    useAppStore.getState().importData({
      tasks: [
        { id: 1, title: '好任务', tag: '学习', prio: 'high', date: '2026-10-20', done: false },
        { id: 1, title: '重复 id' },
        { title: '缺少 id' },
        { id: 'oops', title: '坏 id' },
        { id: 5, title: '   ' },
        'not-an-object',
        { id: 7, title: '坏字段', tag: '不存在', prio: 'urgent', date: '2026/1/1', done: true },
      ],
      notes: [],
    });

    const tasks = useAppStore.getState().tasks;
    expect(tasks.map((t) => t.title)).toEqual(['好任务', '重复 id', '缺少 id', '坏 id', '坏字段']);

    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => Number.isInteger(id) && id > 0)).toBe(true);

    const first = tasks[0];
    expect([first.tag, first.prio, first.date]).toEqual(['学习', 'high', '2026-10-20']);

    const bad = tasks[4];
    expect([bad.tag, bad.prio, bad.date, bad.doneAt]).toEqual(['工作', 'mid', null, null]);
  });

  it('drops empty notes, guarantees unique ids and defaults timestamps', () => {
    useAppStore.getState().importData({
      tasks: [],
      notes: [
        { id: 3, title: '有标题', content: '正文', tag: '生活', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 3, title: '重复', content: 'x', tag: '生活' },
        { title: '', content: '' },
        { id: 'x', content: '只有正文', updatedAt: 'nope' },
      ],
    });

    const notes = useAppStore.getState().notes;
    expect(notes.map((n) => n.title)).toEqual(['有标题', '重复', '']);
    const ids = notes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(notes[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    // invalid timestamps fall back to a valid ISO string
    expect(() => new Date(notes[2].updatedAt).toISOString()).not.toThrow();
  });

  it('restores settings, syncs the default tag and applies the theme', () => {
    useAppStore.getState().importData({
      tasks: [],
      notes: [],
      settings: { theme: 'dark', defaultTag: '健康' },
    });
    expect(useAppStore.getState().settings).toEqual({ theme: 'dark', defaultTag: '健康' });
    expect(useAppStore.getState().addTag).toBe('健康');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('ignores invalid settings and non-array payloads', () => {
    useAppStore.getState().importData({
      tasks: 'nope',
      notes: null,
      settings: { theme: 'neon', defaultTag: '不存在' },
    });
    const s = useAppStore.getState();
    expect(s.tasks).toEqual([]);
    expect(s.notes).toEqual([]);
    expect(s.settings).toEqual({ theme: 'light', defaultTag: '工作' });
  });

  it('resets selection and transient view state', () => {
    useAppStore.setState({
      noteMode: 'edit',
      noteFilter: '工作',
      findOpen: true,
      planView: { kind: 'pending' },
      reschedulingId: 9,
    });
    useAppStore.getState().importData({
      tasks: [{ id: 1, title: 'a' }],
      notes: [{ id: 2, title: '标题', content: '正文' }],
    });
    const s = useAppStore.getState();
    expect(s.currentNoteId).toBe(2);
    expect(s.noteMode).toBe('preview');
    expect(s.noteFilter).toBe('all');
    expect(s.findOpen).toBe(false);
    expect(s.planView).toEqual({ kind: 'date' });
    expect(s.reschedulingId).toBeNull();
  });

  it('only replaces slices whose array is provided', () => {
    useAppStore.setState({
      tasks: [{ id: 1, title: '原有任务', tag: '工作', prio: 'mid', date: null, done: false, doneAt: null }],
      notes: [{ id: 2, title: '原有笔记', content: '正文', tag: '工作', createdAt: '', updatedAt: '' }],
    });
    // A partial file carrying only tasks must not wipe the notes.
    useAppStore.getState().importData({ tasks: [{ id: 9, title: '新任务' }] });
    expect(useAppStore.getState().tasks.map((t) => t.title)).toEqual(['新任务']);
    expect(useAppStore.getState().notes.map((n) => n.title)).toEqual(['原有笔记']);
  });
});

describe('resetAll', () => {
  beforeEach(resetStore);

  it('clears data and transient state but keeps settings', () => {
    useAppStore.setState({
      tasks: [{ id: 1, title: 'a', tag: '工作', prio: 'mid', date: null, done: false, doneAt: null }],
      notes: [{ id: 2, title: '标题', content: '正文', tag: '工作', createdAt: '', updatedAt: '' }],
      settings: { theme: 'dark', defaultTag: '学习' },
      currentNoteId: 2,
      noteMode: 'edit',
      findOpen: true,
      planView: { kind: 'pending' },
    });
    useAppStore.getState().resetAll();
    const s = useAppStore.getState();
    expect(s.tasks).toEqual([]);
    expect(s.notes).toEqual([]);
    expect(s.currentNoteId).toBeNull();
    expect(s.noteMode).toBe('preview');
    expect(s.findOpen).toBe(false);
    expect(s.planView).toEqual({ kind: 'date' });
    expect(s.settings).toEqual({ theme: 'dark', defaultTag: '学习' });
  });
});
