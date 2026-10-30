import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/store';
import { defaultTags } from '@/lib/tags';
import { TagManager } from './TagManager';
import { NotesView } from '@/views/notes/NotesView';

beforeEach(() => useAppStore.setState({tags:defaultTags(), tasks:[], notes:[], noteDraft:null, currentNoteId:null, settings:{theme:'light',palette:'morandi',defaultTag:'工作'},addTag:'工作',noteFilter:'all',newNotePending:false}));
afterEach(cleanup);

describe('tag management', () => {
  it('opens a focused inline editor under the new button and cancels with Escape', () => {
    render(<TagManager />);
    const button = screen.getByRole('button',{name:'＋ 新建标签'});
    fireEvent.click(button);
    const input = screen.getByRole('textbox',{name:'标签名称'});
    expect(input).toHaveFocus();
    const group = screen.getByRole('group',{name:'新建标签'});
    expect(group.parentElement?.nextElementSibling?.id).toBe('tagList');
    expect(document.querySelector('dialog')).toBeNull();
    fireEvent.change(input,{target:{value:'取消的标签'}});
    fireEvent.keyDown(input,{key:'Escape'});
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(button).toHaveFocus();
    expect(useAppStore.getState().tags).toHaveLength(4);
  });
  it('adds on Enter, validates duplicate names, and sets the default from the row', () => {
    render(<TagManager />);
    fireEvent.click(screen.getByRole('button',{name:'＋ 新建标签'}));
    const input = screen.getByRole('textbox',{name:'标签名称'});
    fireEvent.change(input,{target:{value:'工作'}});
    fireEvent.keyDown(input,{key:'Enter'});
    expect(screen.getByRole('alert')).toHaveTextContent('重复');
    fireEvent.change(input,{target:{value:'旅行'}});
    fireEvent.click(screen.getByRole('button',{name:'蓝色'}));
    fireEvent.keyDown(input,{key:'Enter'});
    fireEvent.click(screen.getByRole('button',{name:'设为默认：旅行'}));
    const tag = useAppStore.getState().tags.at(-1)!;
    expect(tag).toMatchObject({name:'旅行',color:'blue'});
    expect(useAppStore.getState().settings.defaultTag).toBe(tag.id);
    expect(screen.getByRole('button',{name:'默认标签：旅行'})).toBeDisabled();
    expect(document.querySelectorAll('.is-default')).toHaveLength(1);
  });
  it('closes the note tag menu with Escape while preserving unsaved note edits', () => {
    const note = {id:1,title:'标题',content:'原正文',tag:'工作',createdAt:'',updatedAt:''};
    useAppStore.setState({notes:[note],noteDraft:{...note,content:'未保存正文'},currentNoteId:1,noteMode:'edit'});
    render(<NotesView />);
    fireEvent.click(screen.getByRole('button',{name:'选择笔记标签'}));
    fireEvent.keyDown(document.activeElement!,{key:'Escape'});
    expect(screen.queryByRole('group',{name:'选择标签'})).toBeNull();
    expect(useAppStore.getState().noteDraft?.content).toBe('未保存正文');
    expect(useAppStore.getState().noteMode).toBe('edit');
  });
  it('keeps tag management out of the note editor and shows names after a rename', () => {
    useAppStore.setState({notes:[{id:1,title:'标题',content:'内容',tag:'工作',createdAt:'',updatedAt:''}],currentNoteId:1});
    render(<NotesView />);
    expect(screen.queryByRole('button',{name:'＋ 新建标签'})).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    act(() => useAppStore.getState().saveTag({name:'项目',color:'blue'},'工作'));
    const trigger = screen.getByRole('button',{name:'选择笔记标签'});
    expect(trigger).toHaveTextContent('项目');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button',{name:'学习'}));
    expect(useAppStore.getState().noteDraft?.tag).toBe('学习');
    expect(useAppStore.getState().notes[0].tag).toBe('工作');
  });
});
