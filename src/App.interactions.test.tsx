import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { useAppStore } from '@/store';
import { addDays, fmt, today, todayStr } from '@/lib/date';

const nextDate = () => fmt(addDays(today(), 5));
const advanceFrame = () => act(() => vi.advanceTimersByTime(40));
const find = (selector: string) => document.querySelector<HTMLElement>(selector)!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  HTMLElement.prototype.scrollIntoView = vi.fn();
  const now = new Date().toISOString();
  useAppStore.setState({
    ready: true, page: 'plan', prevPage: 'plan', selectedDate: todayStr(),
    planView: { kind: 'date' }, calMonth: today(), reschedulingId: null,
    addBegin: todayStr(), addEnd: todayStr(), addTag: '工作',
    newTodoPending: false, newNotePending: false, currentNoteId: 1,
    noteDraft: null, noteMode: 'preview', noteFilter: 'all',
    searchQuery: '', searchType: 'all', saveState: 'idle',
    settings: { theme: 'light', defaultTag: '工作' },
    tasks: [
      { id: 1, title: '今天的任务', tag: '工作', prio: 'mid', beginDate: todayStr(), endDate: todayStr(), done: false, doneAt: null },
      { id: 2, title: '未来任务甲', tag: '学习', prio: 'mid', beginDate: nextDate(), endDate: nextDate(), done: false, doneAt: null },
      { id: 3, title: '未来任务乙', tag: '学习', prio: 'mid', beginDate: nextDate(), endDate: nextDate(), done: false, doneAt: null },
      { id: 4, title: '待排期任务', tag: '工作', prio: 'mid', beginDate: null, endDate: null, done: false, doneAt: null },
    ],
    notes: [{ id: 1, title: '工作笔记', content: '用于验证编辑光标与滚动位置的笔记正文。', tag: '工作', createdAt: now, updatedAt: now }],
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('approved UI interactions', () => {
  it('adds consecutive tasks on the selected date and ignores IME confirmation', () => {
    render(<StrictMode><App /></StrictMode>);
    act(() => useAppStore.getState().goToDate(nextDate()));
    fireEvent.click(find('.quick-new-btn'));
    const input = screen.getByPlaceholderText('添加任务，回车确认（Shift + 回车换行）');
    fireEvent.change(input, { target: { value: '正在选词' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(useAppStore.getState().tasks).toHaveLength(4);
    for (const title of ['新任务甲', '新任务乙']) {
      fireEvent.change(input, { target: { value: title } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }
    expect(useAppStore.getState().tasks.slice(-2).map((t) => t.beginDate)).toEqual([nextDate(), nextDate()]);
    expect(useAppStore.getState().addBegin).toBe(nextDate());
    expect(input).toHaveFocus();
  });


  it('closes the picker and cancels a pending range when Esc exits rescheduling', () => {
    render(<StrictMode><App /></StrictMode>);
    const before = useAppStore.getState().tasks[0];
    fireEvent.click(find('.task [data-act="resched"]'));
    fireEvent.click(screen.getByRole('button', { name: '选择日期' }));
    fireEvent.click(find('.date-pop .day'));
    expect(screen.getByText('再点一天作为结束日 · 同一天两次即为单日')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('.date-pop')).toBeNull();
    expect(useAppStore.getState().reschedulingId).toBeNull();
    expect(useAppStore.getState().tasks[0]).toEqual(before);
  });

  it('restores plan scroll and date after page switches and search', () => {
    render(<StrictMode><App /></StrictMode>);
    act(() => useAppStore.getState().goToDate(nextDate()));
    find('.task-list').scrollTop = 135;
    fireEvent.click(find('.nav-item[data-page="notes"]'));
    fireEvent.click(find('.nav-item[data-page="plan"]'));
    advanceFrame();
    expect(find('.task-list').scrollTop).toBe(135);
    fireEvent.click(screen.getByRole('button', { name: '全局搜索' }));
    fireEvent.click(screen.getByRole('button', { name: '‹ 返回' }));
    advanceFrame();
    expect(useAppStore.getState().selectedDate).toBe(nextDate());
    expect(find('.task-list').scrollTop).toBe(135);
  });

  it('restores note editing, filter, caret, focus and scroll after search', () => {
    render(<StrictMode><App /></StrictMode>);
    act(() => {
      useAppStore.getState().setPage('notes');
      useAppStore.getState().setNoteMode('edit');
      useAppStore.getState().setNoteFilter('工作');
    });
    const input = find('.note-content-input') as HTMLTextAreaElement;
    input.focus(); input.setSelectionRange(3, 8); input.scrollTop = 87;
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    advanceFrame();
    const restored = find('.note-content-input') as HTMLTextAreaElement;
    expect(useAppStore.getState().noteFilter).toBe('工作');
    expect(useAppStore.getState().noteMode).toBe('edit');
    expect(restored.selectionStart).toBe(3);
    expect(restored.selectionEnd).toBe(8);
    expect(restored.scrollTop).toBe(87);
    expect(restored).toHaveFocus();
  });

  it('opens the selected keyboard search result on its own date and highlights it', () => {
    render(<StrictMode><App /></StrictMode>);
    fireEvent.click(screen.getByRole('button', { name: '全局搜索' }));
    const input = screen.getByPlaceholderText('搜索笔记和待办…');
    fireEvent.change(input, { target: { value: '未来任务' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(document.querySelector('.keyboard-active')).toHaveTextContent('未来任务乙');
    fireEvent.keyDown(input, { key: 'Enter' });
    act(() => vi.advanceTimersByTime(70));
    expect(useAppStore.getState().selectedDate).toBe(nextDate());
    expect(document.querySelector('.task.flash')).toHaveTextContent('未来任务乙');
  });

  it('keeps the caret when search saves a new note with a permanent ID', () => {
    render(<StrictMode><App /></StrictMode>);
    fireEvent.keyDown(document, { key: 'n', ctrlKey: true });
    advanceFrame();
    const input = find('.note-content-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '新笔记的正文内容，用于保留编辑位置。' } });
    input.focus(); input.setSelectionRange(2, 6); input.scrollTop = 75;
    expect(useAppStore.getState().currentNoteId).toBeLessThan(0);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(useAppStore.getState().currentNoteId).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '‹ 返回' }));
    advanceFrame();
    const restored = find('.note-content-input') as HTMLTextAreaElement;
    expect(restored.selectionStart).toBe(2);
    expect(restored.selectionEnd).toBe(6);
    expect(restored.scrollTop).toBe(75);
    expect(restored).toHaveFocus();
  });

  it('keeps an unscheduled search hit in the unscheduled view', () => {
    render(<StrictMode><App /></StrictMode>);
    fireEvent.click(screen.getByRole('button', { name: '全局搜索' }));
    const input = screen.getByPlaceholderText('搜索笔记和待办…');
    fireEvent.change(input, { target: { value: '待排期任务' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useAppStore.getState().planView.kind).toBe('unscheduled');
    expect(document.querySelector('.task-list')).toHaveTextContent('待排期任务');
  });
});
