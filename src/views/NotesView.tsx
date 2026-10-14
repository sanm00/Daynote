import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { relTime } from '@/lib/date';
import { TAG_ORDER } from '@/lib/tags';
import { mdToHtml, plainText, insertPair, toggleFence } from '@/lib/markdown';
import { toast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import { getFilteredNotes } from '@/lib/selectors';

const NOTE_ICON = (
  <>
    <path d="M5 3.5h11l3.5 3.5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </>
);

export function NotesView() {
  const notes = useAppStore((s) => s.notes);
  const currentNoteId = useAppStore((s) => s.currentNoteId);
  const noteFilter = useAppStore((s) => s.noteFilter);
  const newNotePending = useAppStore((s) => s.newNotePending);
  const consumeNewNote = useAppStore((s) => s.consumeNewNote);
  const noteMode = useAppStore((s) => s.noteMode);
  const setNoteFilter = useAppStore((s) => s.setNoteFilter);
  const setNoteMode = useAppStore((s) => s.setNoteMode);
  const selectNote = useAppStore((s) => s.selectNote);
  const createNote = useAppStore((s) => s.createNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const finalizeNote = useAppStore((s) => s.finalizeNote);

  const list = useMemo(() => getFilteredNotes(notes, noteFilter), [notes, noteFilter]);
  const note = notes.find((n) => n.id === currentNoteId) ?? null;

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const renderRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  // ---- 正文内查找（仅预览模式）----
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findCase, setFindCase] = useState(false);
  const [findHits, setFindHits] = useState(0);
  const [findIndex, setFindIndex] = useState(0);
  const marksRef = useRef<HTMLElement[]>([]);

  const nfClear = useCallback(() => {
    const rn = renderRef.current;
    if (!rn) return;
    rn.querySelectorAll('mark.nf-hit').forEach((m) =>
      m.replaceWith(document.createTextNode(m.textContent ?? '')),
    );
    rn.normalize();
    marksRef.current = [];
  }, []);

  const nfRun = useCallback(() => {
    nfClear();
    const rn = renderRef.current;
    if (!rn || !findQuery) {
      setFindHits(0);
      setFindIndex(0);
      return;
    }
    const re = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), findCase ? 'g' : 'gi');
    const walker = document.createTreeWalker(rn, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('mark.nf-hit')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const texts: Text[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    texts.forEach((node) => {
      const frag = document.createDocumentFragment();
      let last = 0;
      const src = node.nodeValue ?? '';
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        if (m.index > last) frag.appendChild(document.createTextNode(src.slice(last, m.index)));
        const mark = document.createElement('mark');
        mark.className = 'nf-hit';
        mark.textContent = m[0];
        frag.appendChild(mark);
        last = m.index + m[0].length;
        if (!m[0]) re.lastIndex++;
      }
      if (last < src.length) frag.appendChild(document.createTextNode(src.slice(last)));
      node.replaceWith(frag);
    });
    const hits = [...rn.querySelectorAll<HTMLElement>('mark.nf-hit')];
    marksRef.current = hits;
    setFindHits(hits.length);
    setFindIndex(0);
    if (hits.length) {
      hits.forEach((el, k) => el.classList.toggle('active', k === 0));
      hits[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [findQuery, findCase, nfClear]);

  const nfStep = useCallback(
    (delta: number) => {
      const hits = marksRef.current;
      if (!hits.length) return;
      const next = (((findIndex + delta) % hits.length) + hits.length) % hits.length;
      setFindIndex(next);
      hits.forEach((el, k) => el.classList.toggle('active', k === next));
      hits[next].scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    [findIndex],
  );

  const nfClose = useCallback(() => {
    setFindOpen(false);
    setFindQuery('');
    nfClear();
  }, [nfClear]);

  // Rerun the highlight whenever query/case/content changes while open.
  useEffect(() => {
    if (findOpen && noteMode === 'preview') nfRun();
  }, [findOpen, findQuery, findCase, note?.content, noteMode, nfRun]);

  // Switching to edit mode closes find (demo behavior).
  useEffect(() => {
    if (noteMode === 'edit' && findOpen) nfClose();
  }, [noteMode, findOpen, nfClose]);

  const openFind = useCallback(() => {
    if (!currentNoteId) return;
    if (noteMode !== 'preview') setNoteMode('preview');
    setFindOpen(true);
    window.setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 0);
  }, [currentNoteId, noteMode, setNoteMode]);

  // ⌘F / Ctrl+F anywhere on the notes page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const ta = e.target as HTMLElement | null;
        if (ta && (ta.id === 'noteFindInput' || ta.id === 'globalSearchInput')) return;
        e.preventDefault();
        openFind();
      } else if (e.key === 'Escape' && findOpen) {
        e.preventDefault();
        nfClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openFind, findOpen, nfClose]);

  // ⌘E / Ctrl+E switches the current note into edit mode with the caret at the
  // end of the body. No deps so StrictMode's double-mount cannot stack listeners.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'e') return;
      const st = useAppStore.getState();
      if (st.page !== 'notes' || st.currentNoteId == null) return;
      const ta = e.target as HTMLElement | null;
      if (ta && (ta.id === 'noteFindInput' || ta.id === 'globalSearchInput')) return;
      e.preventDefault();
      st.setNoteMode('edit');
      window.setTimeout(() => {
        const el = contentRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 0);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Drafting state lives here: the id of the note being created. It is dropped
  // when the user leaves it untouched (Esc / switch / leave page) or when the
  // store removes it; content makes it a real note (see finalizeNote).
  const newRef = useRef<number | null>(null);

  const handleCreate = () => {
    createNote();
    newRef.current = useAppStore.getState().currentNoteId;
    setNoteMode('edit');
    window.setTimeout(() => contentRef.current?.focus(), 0);
  };

  const exitNewNote = () => {
    if (newRef.current == null) return;
    const id = newRef.current;
    newRef.current = null;
    finalizeNote(id);
  };

  // Esc leaves editing (or a fresh new note) and returns to preview mode.
  // A still-empty draft is discarded along the way. Registered with no deps so
  // StrictMode's double-mount does not stack duplicate listeners.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const st = useAppStore.getState();
      if (st.noteMode !== 'edit') return;
      e.preventDefault();
      if (newRef.current != null) {
        const id = newRef.current;
        newRef.current = null;
        st.finalizeNote(id);
      } else {
        st.finalizeNote(st.currentNoteId);
      }
      st.setNoteMode('preview');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⌘N from anywhere: create a new note. Consume the pending flag once handled
  // so that plainly visiting this page never spawns a blank note.
  const handledNewNote = useRef(false);
  useEffect(() => {
    if (!newNotePending) {
      handledNewNote.current = false;
      return;
    }
    if (handledNewNote.current) return;
    handledNewNote.current = true;
    handleCreate();
    consumeNewNote();
  }, [newNotePending, consumeNewNote]);

const handleSelect = (id: number) => {
    if (id === currentNoteId) return;
    exitNewNote();
    selectNote(id);
  };

  // Leaving the notes page drops or names a still-untouched new note. Only act
  // when the page actually changed: StrictMode's dev remount would otherwise
  // fire this cleanup while still on the notes page.
  const pageAtMount = useRef(useAppStore.getState().page);
  useEffect(
    () => () => {
      if (newRef.current == null || pageAtMount.current !== 'notes') return;
      const st = useAppStore.getState();
      if (st.page === 'notes') return;
      st.finalizeNote(newRef.current);
      newRef.current = null;
    },
    [],
  );

  const handleDelete = async () => {
    if (!note) return;
    const target = note;
    const ok = await confirmDialog({
      title: '删除笔记',
      message: `确定要删除笔记「${target.title.trim() || '未命名'}」吗？此操作不可恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      danger: true,
    });
    if (!ok) return;
    const remaining = getFilteredNotes(
      notes.filter((n) => n.id !== target.id),
      noteFilter,
    );
    deleteNote(target.id);
    toast('笔记已删除');
    if (remaining.length && currentNoteId === target.id) selectNote(remaining[0].id);
  };

  const rendered = useMemo(() => mdToHtml(note?.content ?? ''), [note?.content]);

  const applyEdit = (result: { text: string; start: number; end: number }) => {
    if (!note) return;
    updateNote(note.id, { content: result.text });
    window.requestAnimationFrame(() => {
      const el = contentRef.current;
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
    <section className="page active" id="page-notes">
      <div className="notes-layout">
        <aside className="notes-side">
          <div className="notes-side-head">
            <button className="btn primary" title="新建笔记（⌘N）" onClick={handleCreate}>
              + 新建笔记
              <span className="btn-hint">⌘N</span>
            </button>
          </div>
          <div className="notes-filter" id="noteFilter">
            <button
              className={`filter-chip${noteFilter === 'all' ? ' active' : ''}`}
              data-filter="all"
              onClick={() => setNoteFilter('all')}
            >
              全部
            </button>
            {TAG_ORDER.map((tag) => (
              <button
                key={tag}
                className={`filter-chip${noteFilter === tag ? ' selected active' : ''}`}
                data-filter={tag}
                onClick={() => setNoteFilter(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="notes-list">
            {!list.length ? (
              <div className="empty-tip" style={{ padding: '28px 0' }}>
                <svg viewBox="0 0 24 24">{NOTE_ICON}</svg>
                <span>没有符合条件的笔记</span>
              </div>
            ) : (
              list.map((n) => (
                <div
                  key={n.id}
                  className={`note-item${n.id === currentNoteId ? ' active' : ''}`}
                  onClick={() => handleSelect(n.id)}
                >
                  <div className="note-item-title">{n.title || '无标题'}</div>
                  <div className="note-item-snippet">{plainText(n.content).slice(0, 60) || '暂无内容'}</div>
                  <div className="note-item-foot">
                    <span className="tag" data-tag={n.tag}>
                      {n.tag}
                    </span>
                    <span className="note-item-time">{relTime(n.updatedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="notes-main">
          {!note ? (
            <div className="notes-empty">
              <svg viewBox="0 0 24 24">{NOTE_ICON}</svg>
              <div>选择一条笔记，或新建一条</div>
              <div className="hint">想到什么就记下来，不打断思路</div>
            </div>
          ) : (
            <div className="note-editor" data-id={note.id}>
              <input
                ref={titleRef}
                className="note-title-input"
                value={note.title}
                placeholder="笔记标题"
                onChange={(e) => updateNote(note.id, { title: e.target.value })}
              />
              <div className="note-editor-meta">
                <div className="note-tags">
                  {TAG_ORDER.map((tag) => (
                    <button
                      key={tag}
                      className={`note-tag-chip${tag === note.tag ? ' active' : ''}`}
                      data-tag={tag}
                      onClick={() => updateNote(note.id, { tag })}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <span className="note-time">更新于 {relTime(note.updatedAt)}</span>
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
                        const ta = contentRef.current;
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
                  className={`note-find-btn${findOpen ? ' on' : ''}`}
                  title="在正文中查找（⌘F）"
                  onClick={() => (findOpen ? nfClose() : openFind())}
                >
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="M20 20l-3.6-3.6" />
                  </svg>
                </button>
                <button className="note-del-btn" onClick={handleDelete}>
                  删除
                </button>
              </div>

              {findOpen && (
                <div className="note-find-bar">
                  <input
                    ref={findInputRef}
                    className="note-find-input"
                    id="noteFindInput"
                    placeholder="在正文中查找…"
                    autoComplete="off"
                    spellCheck={false}
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        nfStep(e.shiftKey ? -1 : 1);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        nfClose();
                      }
                    }}
                  />
                  <span className={`note-find-count${findQuery && !findHits ? ' zero' : ''}`}>
                    {findHits ? `${findIndex + 1}/${findHits}` : '0'}
                  </span>
                  <button className="note-find-nav" title="上一个（Shift + Enter）" onClick={() => nfStep(-1)}>
                    <svg viewBox="0 0 24 24">
                      <path d="M6 14l6-6 6 6" />
                    </svg>
                  </button>
                  <button className="note-find-nav" title="下一个（Enter）" onClick={() => nfStep(1)}>
                    <svg viewBox="0 0 24 24">
                      <path d="M6 10l6 6 6-6" />
                    </svg>
                  </button>
                  <button
                    className={`note-find-case${findCase ? ' on' : ''}`}
                    title="区分大小写"
                    onClick={() => setFindCase((v) => !v)}
                  >
                    Aa
                  </button>
                  <button className="note-find-close" title="关闭（Esc）" onClick={nfClose}>
                    ×
                  </button>
                </div>
              )}

              <div className="note-editor-hint" style={{ display: noteMode === 'edit' ? '' : 'none' }}>
                输入 Markdown 实时渲染：<b>#</b> 标题 · <b>-</b> 列表 · <b>- [ ]</b> 待办 · <b>&gt;</b> 引用 ·{' '}
                <b>`</b> 代码 · <b>**</b> 加粗 · <b>⌘/</b> 代码块 · <b>⌘\`</b> 行内代码 · <b>Tab</b> 缩进
              </div>
              <textarea
                ref={contentRef}
                className="note-content-input"
                placeholder="开始写点什么，支持 Markdown 语法…"
                style={{ display: noteMode === 'edit' ? '' : 'none' }}
                value={note.content}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                onChange={(e) => updateNote(note.id, { content: e.target.value })}
                onKeyDown={onContentKeyDown}
                onBeforeInput={onContentBeforeInput}
              />
              <div
                ref={renderRef}
                className="note-render"
                style={{ display: noteMode === 'edit' ? 'none' : '' }}
                dangerouslySetInnerHTML={{ __html: rendered }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
