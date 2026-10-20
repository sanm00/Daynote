import { useMemo } from 'react';
import { useAppStore } from '@/store';
import { TAG_ORDER } from '@/lib/tags';
import { mdToHtml, insertPair, toggleFence } from '@/lib/markdown';
import type { Note } from '@/types';
import { SaveStatus } from '@/components/SaveStatus';
import type { NoteFind } from './useNoteFind';

interface Props {
  note: Note;
  find: NoteFind;
  dirty: boolean;
}

export function NoteEditor({ note, find, dirty }: Props) {
  const noteMode = useAppStore((s) => s.noteMode);
  const setNoteMode = useAppStore((s) => s.setNoteMode);
  const editDraft = useAppStore((s) => s.editDraft);
  const commitDraft = useAppStore((s) => s.commitDraft);

  const rendered = useMemo(() => mdToHtml(note.content), [note.content]);

  const applyEdit = (result: { text: string; start: number; end: number }) => {
    editDraft({ content: result.text });
    window.requestAnimationFrame(() => {
      const el = find.editRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(result.start, result.end);
      }
    });
  };

  // Tab indents the selection with two spaces instead of leaving the editor.
  const onContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const v = el.value;
      const s = el.selectionStart;
      const en = el.selectionEnd;
      if (s === en && !e.shiftKey) {
        applyEdit({ text: v.slice(0, s) + '  ' + v.slice(en), start: s + 2, end: s + 2 });
        return;
      }
      const ls = v.lastIndexOf('\n', Math.max(0, s - 1)) + 1;
      let le = v.indexOf('\n', en);
      if (le === -1) le = v.length;
      const block = v.slice(ls, le);
      const next = e.shiftKey
        ? block.replace(/^(  |\t)/gm, '')
        : block.replace(/^/gm, '  ');
      const delta = next.length - block.length;
      applyEdit({
        text: v.slice(0, ls) + next + v.slice(le),
        start: ls,
        end: le + delta,
      });
      return;
    }
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === 'e') return;
      if (key === 'b') {
        e.preventDefault();
        applyEdit(insertPair(el.value, el.selectionStart, el.selectionEnd, '**'));
      } else if (key === '`' && !e.shiftKey) {
        e.preventDefault();
        applyEdit(insertPair(el.value, el.selectionStart, el.selectionEnd, '`'));
      } else if (key === '/') {
        e.preventDefault();
        applyEdit(toggleFence(el.value, el.selectionStart, el.selectionEnd, ''));
      }
    }
  };

  // Backtick around a selection opens a code span instead of doubling up.
  const onContentBeforeInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const ev = e.nativeEvent as InputEvent;
    if (ev.inputType !== 'insertText') return;
    const el = e.currentTarget;
    const data = ev.data;
    if (data !== '`' && data !== '**') return;
    if (el.selectionStart === el.selectionEnd) return;
    e.preventDefault();
    applyEdit(insertPair(el.value, el.selectionStart, el.selectionEnd, data));
  };

  return (
    <div className="note-editor" data-id={note.id}>
      <input
        ref={find.titleRef}
        className="note-title-input"
        value={note.title}
        placeholder="笔记标题"
        onChange={(e) => editDraft({ title: e.target.value })}
      />
      <div className="note-editor-meta">
        <div className="note-tags">
          {TAG_ORDER.map((tag) => (
            <button
              key={tag}
              className={`note-tag-chip${tag === note.tag ? ' active' : ''}`}
              data-tag={tag}
              onClick={() => editDraft({ tag })}
            >
              {tag}
            </button>
          ))}
        </div>
        <SaveStatus updatedAt={note.updatedAt} dirty={dirty} onSave={commitDraft} />
        <div className="view-switch" data-mode={noteMode}>
          <span className="view-switch-thumb" />
          <button
            className={`view-switch-btn${noteMode === 'preview' ? ' active' : ''}`}
            title="预览渲染效果（Esc）"
            onClick={() => setNoteMode('preview')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
            <span>预览</span>
          </button>
          <button
            className={`view-switch-btn${noteMode === 'edit' ? ' active' : ''}`}
            title="编辑 Markdown 源码（⌘E）"
            onClick={() => {
              setNoteMode('edit');
              window.setTimeout(() => {
                const ta = find.editRef.current;
                if (ta) {
                  ta.focus();
                  ta.setSelectionRange(ta.value.length, ta.value.length);
                }
              }, 0);
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
              <path d="M13.5 6.5l3 3" />
            </svg>
            <span>编辑</span>
          </button>
        </div>
        <button
          className={`note-find-btn${find.open ? ' on' : ''}`}
          title="在正文中查找（⌘F）"
          onClick={() => (find.open ? find.close() : find.openFind())}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-3.6-3.6" />
          </svg>
        </button>
        <button className="note-del-btn" onClick={find.onDelete}>
          删除
        </button>
      </div>

      {find.open && (
        <div className="note-find-bar">
          <input
            ref={find.inputRef}
            className="note-find-input"
            id="noteFindInput"
            placeholder="在正文中查找…"
            autoComplete="off"
            spellCheck={false}
            value={find.query}
            onChange={(e) => find.setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                find.step(e.shiftKey ? -1 : 1);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                find.close();
              }
            }}
          />
          <span className={`note-find-count${find.query && !find.hits ? ' zero' : ''}`}>
            {find.hits ? `${find.index + 1}/${find.hits}` : '0'}
          </span>
          <button className="note-find-nav" title="上一个（Shift + Enter）" onClick={() => find.step(-1)}>
            <svg viewBox="0 0 24 24">
              <path d="M6 14l6-6 6 6" />
            </svg>
          </button>
          <button className="note-find-nav" title="下一个（Enter）" onClick={() => find.step(1)}>
            <svg viewBox="0 0 24 24">
              <path d="M6 10l6 6 6-6" />
            </svg>
          </button>
          <button
            className={`note-find-case${find.caseOn ? ' on' : ''}`}
            title="区分大小写"
            onClick={find.toggleCase}
          >
            Aa
          </button>
          <button className="note-find-close" title="关闭（Esc）" onClick={find.close}>
            ×
          </button>
        </div>
      )}

      <div className="note-editor-hint" style={{ display: noteMode === 'edit' ? '' : 'none' }}>
        输入 Markdown 实时渲染：<b>#</b> 标题 · <b>-</b> 列表 · <b>- [ ]</b> 待办 · <b>&gt;</b> 引用 ·{' '}
        <b>`</b> 代码 · <b>**</b> 加粗 · <b>⌘/</b> 代码块 · <b>⌘\`</b> 行内代码 · <b>Tab</b> 缩进
      </div>
      <textarea
        ref={find.editRef}
        className="note-content-input"
        placeholder="开始写点什么，支持 Markdown 语法…"
        style={{ display: noteMode === 'edit' ? '' : 'none' }}
        value={note.content}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        onChange={(e) => editDraft({ content: e.target.value })}
        onKeyDown={onContentKeyDown}
        onBeforeInput={onContentBeforeInput}
      />
      <div
        ref={find.renderRef}
        className="note-render"
        style={{ display: noteMode === 'edit' ? 'none' : '' }}
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    </div>
  );
}
