import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/store';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { getFilteredNotes } from '@/lib/selectors';
import { NotesSidebar, NOTE_ICON } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import { useNoteFind, useEditShortcut } from './useNoteFind';

export function NotesView() {
  const notes = useAppStore((s) => s.notes);
  const currentNoteId = useAppStore((s) => s.currentNoteId);
  const noteFilter = useAppStore((s) => s.noteFilter);
  const newNotePending = useAppStore((s) => s.newNotePending);
  const consumeNewNote = useAppStore((s) => s.consumeNewNote);
  const setNoteMode = useAppStore((s) => s.setNoteMode);
  const selectNote = useAppStore((s) => s.selectNote);
  const createNote = useAppStore((s) => s.createNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const finalizeNote = useAppStore((s) => s.finalizeNote);

  const list = useMemo(() => getFilteredNotes(notes, noteFilter), [notes, noteFilter]);
  const note = notes.find((n) => n.id === currentNoteId) ?? null;

  // Drafting state lives here: the id of the note being created. It is dropped
  // when the user leaves it untouched (Esc / switch / leave page) or when the
  // store removes it; content makes it a real note (see finalizeNote).
  const newRef = useRef<number | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const handleCreate = () => {
    createNote();
    newRef.current = useAppStore.getState().currentNoteId;
    setNoteMode('edit');
    window.setTimeout(() => editRef.current?.focus(), 0);
  };

  const exitNewNote = () => {
    if (newRef.current == null) return;
    const id = newRef.current;
    newRef.current = null;
    finalizeNote(id);
  };

  const handleSelect = (id: number) => {
    if (id === currentNoteId) return;
    exitNewNote();
    selectNote(id);
  };

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

  const find = useNoteFind(note?.content, { onDelete: handleDelete });
  useEditShortcut(find.editRef);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newNotePending, consumeNewNote]);

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

  return (
    <section className="page active" id="page-notes">
      <div className="notes-layout">
        <NotesSidebar list={list} onSelect={handleSelect} onCreate={handleCreate} />
        <div className="notes-main">
          {!note ? (
            <div className="notes-empty">
              <svg viewBox="0 0 24 24">{NOTE_ICON}</svg>
              <div>选择一条笔记，或新建一条</div>
              <div className="hint">想到什么就记下来，不打断思路</div>
            </div>
          ) : (
            <NoteEditor note={note} find={find} />
          )}
        </div>
      </div>
    </section>
  );
}
