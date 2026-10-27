import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@/store';
import { defaultTags } from '@/lib/tags';
import { NoteTagPicker } from './NoteTagPicker';

beforeEach(() => useAppStore.setState({tags:defaultTags()}));
afterEach(cleanup);

describe('note tag dropdown', () => {
  it('uses the shared dropdown and closes after selecting an existing tag', () => {
    const select = vi.fn();
    render(<NoteTagPicker value="工作" noteId={1} onSelect={select} />);
    const trigger = screen.getByRole('button',{name:'选择笔记标签'});
    expect(trigger).toHaveTextContent('工作');
    expect(screen.queryByRole('button',{name:'下一页标签'})).toBeNull();
    fireEvent.click(trigger);
    const dropdown = screen.getByRole('group',{name:'选择标签'});
    expect(dropdown).toHaveClass('tag-menu');
    expect(dropdown.textContent).not.toContain('新建');
    expect(screen.getByRole('button',{name:'工作 ✓'})).toHaveFocus();
    fireEvent.click(screen.getByRole('button',{name:'学习'}));
    expect(select).toHaveBeenCalledWith('学习');
    expect(screen.queryByRole('group',{name:'选择标签'})).toBeNull();
    expect(trigger).toHaveFocus();
  });
  it('closes with Escape without changing the tag and closes when switching notes', () => {
    const select = vi.fn();
    const view = render(<NoteTagPicker value="工作" noteId={1} onSelect={select} />);
    const trigger = screen.getByRole('button',{name:'选择笔记标签'});
    fireEvent.click(trigger);
    fireEvent.keyDown(document.activeElement!,{key:'Escape'});
    expect(select).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('group',{name:'选择标签'})).toBeNull();
    fireEvent.click(trigger);
    view.rerender(<NoteTagPicker value="健康" noteId={2} onSelect={select} />);
    expect(screen.queryByRole('group',{name:'选择标签'})).toBeNull();
    expect(screen.getByRole('button',{name:'选择笔记标签'})).toHaveTextContent('健康');
  });
});
