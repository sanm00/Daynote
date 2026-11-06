import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@/store';
import { NotesView } from './NotesView';
import { saveNoteImage } from '@/lib/images';

vi.mock('@/lib/images', async (original) => ({
  ...await original<typeof import('@/lib/images')>(),
  saveNoteImage: vi.fn(),
  loadNoteImage: vi.fn().mockResolvedValue('blob:demo'),
}));

const reference = `images/${'a'.repeat(64)}.png`;
const paste = (editor: HTMLTextAreaElement) => fireEvent.paste(editor, {
  clipboardData: { items: [{ kind: 'file', type: 'image/png',
    getAsFile: () => new File(['image'], 'clipboard.png', { type: 'image/png' }) }] },
});

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('URL', { revokeObjectURL: vi.fn() });
  vi.mocked(saveNoteImage).mockReset();
  const now = new Date().toISOString();
  useAppStore.setState({ page: 'notes', currentNoteId: 1, noteDraft: null,
    noteMode: 'edit', noteFilter: 'all', newNotePending: false,
    notes: [{ id: 1, title: '笔记', content: '前后', tag: '工作', createdAt: now, updatedAt: now }] });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('clipboard images', () => {
  it('inserts a saved image at the caret and resolves its preview', async () => {
    vi.mocked(saveNoteImage).mockResolvedValue(reference);
    const view = render(<NotesView />);
    const editor = view.container.querySelector('textarea')!;
    editor.setSelectionRange(1, 1);
    await act(async () => { paste(editor); });
    expect(editor.value).toBe(`前![截图](${reference})后`);
    expect(useAppStore.getState().notes[0].content).toBe('前后');
    await act(async () => { useAppStore.getState().setNoteMode('preview'); });
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('blob:demo');
    act(() => useAppStore.getState().commitDraft());
    expect(useAppStore.getState().notes[0].content).toContain(reference);
  });

  it('does not insert into a discarded draft while saving', async () => {
    let finish!: (reference: string) => void;
    vi.mocked(saveNoteImage).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<NotesView />);
    paste(view.container.querySelector('textarea')!);
    act(() => useAppStore.getState().setNoteMode('preview'));
    await act(async () => { finish(reference); });
    expect(useAppStore.getState().noteDraft).toBeNull();
    expect(useAppStore.getState().notes[0].content).toBe('前后');
  });

  it('preserves the body on save failure and leaves text paste to the browser', async () => {
    vi.mocked(saveNoteImage).mockRejectedValue(new Error('disk full'));
    const view = render(<NotesView />);
    const editor = view.container.querySelector('textarea')!;
    await act(async () => { paste(editor); });
    expect(editor.value).toBe('前后');
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { items: [] } });
    fireEvent(editor, event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('manual save', () => {
  it('commits the draft and reveals the preview', () => {
    const now = new Date().toISOString();
    useAppStore.setState({
      noteDraft: { id: 1, title: '笔记', content: '保存后', tag: '工作', createdAt: now, updatedAt: now },
    });
    const view = render(<NotesView />);
    fireEvent.click(view.container.querySelector('.save-now')!);
    expect(useAppStore.getState().noteMode).toBe('preview');
    expect(useAppStore.getState().notes[0].content).toBe('保存后');
  });
});

describe('in-body find in edit mode', () => {
  const seedDraft = (content: string) => {
    const now = new Date().toISOString();
    useAppStore.setState({
      noteDraft: { id: 1, title: '笔记', content, tag: '工作', createdAt: now, updatedAt: now },
    });
  };

  it('counts matches and walks them in the textarea', () => {
    seedDraft('前后前后');
    const view = render(<NotesView />);
    fireEvent.keyDown(document, { key: 'f', metaKey: true });
    const input = view.container.querySelector<HTMLInputElement>('#noteFindInput')!;
    fireEvent.change(input, { target: { value: '前后' } });
    const ta = view.container.querySelector('textarea')!;
    expect(view.container.querySelector('.note-find-count')?.textContent).toBe('1/2');
    expect([ta.selectionStart, ta.selectionEnd]).toEqual([0, 2]);
    const marks = view.container.querySelectorAll('.note-find-backdrop mark.nf-hit');
    expect(marks).toHaveLength(2);
    expect(view.container.querySelector('.note-find-backdrop mark.nf-hit.active')?.textContent).toBe('前后');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(view.container.querySelector('.note-find-count')?.textContent).toBe('2/2');
    expect([ta.selectionStart, ta.selectionEnd]).toEqual([2, 4]);
  });

  it('escapes markup in the highlight backdrop', () => {
    seedDraft('<b>标签</b>');
    const view = render(<NotesView />);
    fireEvent.keyDown(document, { key: 'f', metaKey: true });
    fireEvent.change(view.container.querySelector('#noteFindInput')!, { target: { value: '<b>' } });
    const mark = view.container.querySelector('.note-find-backdrop mark.nf-hit')!;
    expect(mark.textContent).toBe('<b>');
    expect(view.container.querySelector('.note-find-backdrop')?.querySelector('b')).toBeNull();
  });

  it('honours the case toggle and clears hits when the query is emptied', () => {
    seedDraft('Alpha alpha');
    const view = render(<NotesView />);
    fireEvent.keyDown(document, { key: 'f', metaKey: true });
    const input = view.container.querySelector<HTMLInputElement>('#noteFindInput')!;
    fireEvent.change(input, { target: { value: 'alpha' } });
    expect(view.container.querySelector('.note-find-count')?.textContent).toBe('1/2');
    fireEvent.click(view.container.querySelector('.note-find-case')!);
    expect(view.container.querySelector('.note-find-count')?.textContent).toBe('1/1');
    fireEvent.change(input, { target: { value: '' } });
    expect(view.container.querySelector('.note-find-count')?.textContent).toBe('0');
  });

  it('closes on Escape without discarding the edit draft', () => {
    seedDraft('前后');
    const view = render(<NotesView />);
    fireEvent.keyDown(document, { key: 'f', metaKey: true });
    expect(view.container.querySelector('.note-find-bar')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(view.container.querySelector('.note-find-bar')).toBeNull();
    expect(useAppStore.getState().noteMode).toBe('edit');
    expect(useAppStore.getState().noteDraft?.content).toBe('前后');
  });
});
