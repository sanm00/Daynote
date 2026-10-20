import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/store';
import { addDays, doneAtLabel, fmt, today, todayStr } from '@/lib/date';

function resetStore() {
  useAppStore.setState({
    tasks: [],
    notes: [],
    settings: { theme: 'light', defaultTag: '工作' },
    addTag: '工作',
    currentNoteId: null,
    noteDraft: null,
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
        { id: 1, title: '好任务', tag: '学习', prio: 'high', beginDate: '2026-10-20', endDate: '2026-10-22', done: false },
        { id: 1, title: '重复 id' },
        { title: '缺少 id' },
        { id: 'oops', title: '坏 id' },
        { id: 5, title: '   ' },
        'not-an-object',
        { id: 7, title: '坏字段', tag: '不存在', prio: 'urgent', beginDate: '2026/1/1', done: true },
      ],
      notes: [],
    });

    const tasks = useAppStore.getState().tasks;
    expect(tasks.map((t) => t.title)).toEqual(['好任务', '重复 id', '缺少 id', '坏 id', '坏字段']);

    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => Number.isInteger(id) && id > 0)).toBe(true);

    const first = tasks[0];
    expect([first.tag, first.prio, first.beginDate, first.endDate]).toEqual([
      '学习',
      'high',
      '2026-10-20',
      '2026-10-22',
    ]);

    const bad = tasks[4];
    expect([bad.tag, bad.prio, bad.beginDate, bad.endDate, bad.doneAt]).toEqual([
      '工作',
      'mid',
      null,
      null,
      null,
    ]);
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
      tasks: [{ id: 1, title: '原有任务', tag: '工作', prio: 'mid', beginDate: null, endDate: null, done: false, doneAt: null }],
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
      tasks: [{ id: 1, title: 'a', tag: '工作', prio: 'mid', beginDate: null, endDate: null, done: false, doneAt: null }],
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

describe('updateTask', () => {
  beforeEach(() => {
    resetStore();
    useAppStore.setState({
      tasks: [
        { id: 1, title: '原任务', tag: '工作', prio: 'mid', beginDate: null, endDate: null, done: false, doneAt: null },
      ],
    });
  });

  it('renames the task, trimming surrounding whitespace', () => {
    useAppStore.getState().updateTask(1, { title: '  新名字  ' });
    expect(useAppStore.getState().tasks[0].title).toBe('新名字');
  });

  it('ignores a blank title (no empty task names)', () => {
    useAppStore.getState().updateTask(1, { title: '   ' });
    expect(useAppStore.getState().tasks[0].title).toBe('原任务');
  });

  it('is a no-op for an unknown id', () => {
    useAppStore.getState().updateTask(99, { title: 'x' });
    expect(useAppStore.getState().tasks.map((t) => t.title)).toEqual(['原任务']);
  });
});

describe('scheduling', () => {
  beforeEach(() => {
    resetStore();
    useAppStore.setState({
      tasks: [
        {
          id: 1,
          title: '出差 · 杭州',
          tag: '工作',
          prio: 'mid',
          beginDate: fmt(addDays(today(), -1)),
          endDate: fmt(addDays(today(), 1)),
          done: false,
          doneAt: null,
        },
      ],
    });
  });

  it('reschedules to an inclusive range', () => {
    useAppStore.getState().rescheduleTask(1, { begin: '2026-05-01', end: '2026-05-04' });
    const t = useAppStore.getState().tasks[0];
    expect([t.beginDate, t.endDate]).toEqual(['2026-05-01', '2026-05-04']);
  });

  it('clears the schedule when the range is null', () => {
    useAppStore.getState().rescheduleTask(1, null);
    const t = useAppStore.getState().tasks[0];
    expect([t.beginDate, t.endDate]).toEqual([null, null]);
  });

  it('postpones a span that ends on the selected day by one day, keeping its length', () => {
    const from = fmt(addDays(today(), 1));
    const end = fmt(addDays(today(), 3));
    useAppStore.setState({
      selectedDate: end,
      tasks: [
        { id: 1, title: 'x', tag: '工作', prio: 'mid', beginDate: from, endDate: end, done: false, doneAt: null },
      ],
    });
    useAppStore.getState().postponeUnfinished();
    const t = useAppStore.getState().tasks[0];
    expect([t.beginDate, t.endDate]).toEqual([fmt(addDays(today(), 2)), fmt(addDays(today(), 4))]);
  });

  it('moves tasks to today as a single day', () => {
    useAppStore.getState().moveAllToToday([1]);
    const t = useAppStore.getState().tasks[0];
    expect([t.beginDate, t.endDate]).toEqual([todayStr(), todayStr()]);
  });
});

describe('doneAtLabel', () => {
  it('prefixes 今天 for today and uses the full date otherwise', () => {
    const now = new Date();
    now.setHours(16, 0, 0, 0);
    expect(doneAtLabel(now.toISOString())).toBe('今天 16:00');
    const past = new Date(2026, 9, 15, 9, 5, 0);
    expect(doneAtLabel(past.toISOString())).toBe('2026-10-15 09:05');
  });
});

describe('persistNow', () => {
  beforeEach(resetStore);

  it('flips the save state to saved once the write resolves', async () => {
    useAppStore.setState({ saveState: 'saving' });
    await useAppStore.getState().persistNow();
    expect(useAppStore.getState().saveState).toBe('saved');
  });
});

describe('note draft (manual save)', () => {
  const seedNote = () => {
    resetStore();
    useAppStore.setState({
      notes: [
        { id: 1, title: '原标题', content: '原正文', tag: '工作', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      ],
      currentNoteId: 1,
    });
  };

  beforeEach(seedNote);

  it('buffers edits in the draft without touching the saved note', () => {
    useAppStore.getState().editDraft({ content: '改成新正文' });
    expect(useAppStore.getState().notes[0].content).toBe('原正文');
    expect(useAppStore.getState().noteDraft?.content).toBe('改成新正文');
    // Title mirrors the body until the user types one.
    expect(useAppStore.getState().noteDraft?.title).toBe('改成新正文');
  });

  it('commits existing-note edits to the saved note', () => {
    useAppStore.getState().editDraft({ title: '新标题' });
    useAppStore.getState().commitDraft();
    const s = useAppStore.getState();
    expect(s.notes[0].title).toBe('新标题');
    expect(s.noteDraft).toBeNull();
  });

  it('creates a new note only on commit, with a real id', () => {
    useAppStore.getState().newNoteDraft();
    const draft = useAppStore.getState().noteDraft;
    expect(draft?.id).toBeLessThan(0);
    expect(useAppStore.getState().notes).toHaveLength(1);

    useAppStore.getState().editDraft({ content: '新笔记正文' });
    useAppStore.getState().commitDraft();
    const s = useAppStore.getState();
    expect(s.notes).toHaveLength(2);
    expect(s.notes[0].title).toBe('新笔记正文');
    expect(s.currentNoteId).toBe(s.notes[0].id);
  });

  it('drops an abandoned blank new note on commit', () => {
    useAppStore.getState().newNoteDraft();
    useAppStore.getState().commitDraft();
    const s = useAppStore.getState();
    expect(s.notes).toHaveLength(1);
    expect(s.noteDraft).toBeNull();
    expect(s.currentNoteId).toBe(1);
  });

  it('discards the draft, reverting to the last saved content', () => {
    useAppStore.getState().editDraft({ content: '临时改动' });
    useAppStore.getState().discardDraft();
    const s = useAppStore.getState();
    expect(s.noteDraft).toBeNull();
    expect(s.notes[0].content).toBe('原正文');
    expect(s.currentNoteId).toBe(1);
  });

  it('leaves a note with changes via selectNote, saving the draft', () => {
    useAppStore.getState().editDraft({ content: '离开时保存' });
    useAppStore.setState({
      notes: [
        useAppStore.getState().notes[0],
        { id: 2, title: '第二条', content: '', tag: '工作', createdAt: '', updatedAt: '' },
      ],
    });
    useAppStore.getState().selectNote(2);
    const s = useAppStore.getState();
    expect(s.notes[0].content).toBe('离开时保存');
    expect(s.noteDraft).toBeNull();
    expect(s.currentNoteId).toBe(2);
  });
});

describe('plan page defaults', () => {
  beforeEach(resetStore);

  it('selects today (date view) whenever the plan page is entered', () => {
    useAppStore.setState({
      page: 'settings',
      selectedDate: '2000-01-01',
      planView: { kind: 'pending' },
      calMonth: new Date(2000, 0, 1),
      reschedulingId: 5,
    });
    useAppStore.getState().setPage('plan');
    const s = useAppStore.getState();
    expect(s.selectedDate).toBe(todayStr());
    expect(s.planView).toEqual({ kind: 'date' });
    expect(s.reschedulingId).toBeNull();
  });

  it('lands on today for ⌘I new todo as well', () => {
    useAppStore.setState({ page: 'notes', selectedDate: '2000-01-01', planView: { kind: 'unscheduled' } });
    useAppStore.getState().requestNewTodo();
    const s = useAppStore.getState();
    expect(s.page).toBe('plan');
    expect(s.selectedDate).toBe(todayStr());
    expect(s.planView).toEqual({ kind: 'date' });
  });
});
