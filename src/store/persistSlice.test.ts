import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@/store';
import { storage, type StoreData } from '@/lib/storage';
import { mdToHtml } from '@/lib/markdown';

describe('first-run examples', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 12));
    vi.stubEnv('PROD', true);
    vi.spyOn(storage, 'load').mockResolvedValue(null);
    vi.spyOn(storage, 'save').mockResolvedValue();
    vi.spyOn(storage, 'root').mockResolvedValue(null);
    useAppStore.setState({
      tasks: [], notes: [], currentNoteId: null, noteDraft: null, ready: false,
      settings: { theme: 'light', defaultTag: '工作' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('persists one example note and two tasks dated at first launch, including a cross-year span', async () => {
    await useAppStore.getState().hydrateFromStorage();
    const { notes, tasks, currentNoteId } = useAppStore.getState();
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('示例笔记');
    expect(currentNoteId).toBe(notes[0].id);
    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => [task.beginDate, task.endDate, task.done, task.doneAt])).toEqual([
      ['2026-12-31', '2026-12-31', false, null],
      ['2026-12-31', '2027-01-01', false, null],
    ]);
    expect(storage.save).toHaveBeenCalledWith(expect.objectContaining({ notes, tasks }));
  });

  it('keeps the example title when its body is edited on the first launch', async () => {
    await useAppStore.getState().hydrateFromStorage();
    useAppStore.getState().editDraft({ content: '开始记录自己的内容' });
    useAppStore.getState().commitDraft();
    expect(useAppStore.getState().notes[0].title).toBe('示例笔记');
  });

  it('renders the supported Markdown examples and resolves the bundled image', async () => {
    await useAppStore.getState().hydrateFromStorage();
    const note = useAppStore.getState().notes[0];
    const preview = document.createElement('div');
    preview.innerHTML = mdToHtml(note.content);
    for (const selector of [
      'h1', 'h2', 'h3', 'h4', 'p br', 'strong', 'em', 'del', 'code',
      'ul li', 'ol li', '.note-task:not(.done)', '.note-task.done',
      'blockquote', 'hr', 'a[href="https://daringfireball.net/projects/markdown/syntax"]',
      'img[alt="Daynote 应用图标"]', 'table th', 'table td', 'pre code',
    ]) {
      expect(preview.querySelector(selector), selector).not.toBeNull();
    }
    expect(preview.querySelector('img')?.getAttribute('src')).toBeTruthy();
    expect(note.content).not.toContain('{{icon}}');
    expect(preview.textContent).toContain('内容中的竖线：|');
  });

  it('keeps the full demo dataset in development', async () => {
    vi.stubEnv('PROD', false);
    await useAppStore.getState().hydrateFromStorage();
    expect(useAppStore.getState().notes.length).toBeGreaterThan(1);
    expect(useAppStore.getState().tasks.length).toBeGreaterThan(2);
  });

  it.each([false, true])('preserves existing data in production, including an empty collection (%s)', async (empty) => {
    const existing: StoreData = {
      version: 2,
      settings: { theme: 'light', defaultTag: '生活' },
      tasks: [],
      notes: empty ? [] : [{
        id: 42, title: '我的笔记', content: '保留已有内容', tag: '生活',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }],
    };
    vi.mocked(storage.load).mockResolvedValue(existing);
    await useAppStore.getState().hydrateFromStorage();
    expect(useAppStore.getState().notes).toEqual(existing.notes);
    expect(useAppStore.getState().tasks).toEqual(existing.tasks);
    expect(storage.save).not.toHaveBeenCalled();
  });
});
