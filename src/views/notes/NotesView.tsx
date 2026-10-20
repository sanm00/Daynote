import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/store';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { getFilteredNotes, isDraftDirty, withDraft } from '@/lib/selectors';
import { NotesSidebar, NOTE_ICON } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import { useNoteFind, useEditShortcut } from './useNoteFind';

export function NotesView() {
  const notes = useAppStore((s) => s.notes);
  const currentNoteId = useAppStore((s) => s.currentNoteId);
  const noteDraft = useAppStore((s) => s.noteDraft);
  const noteFilter = useAppStore((s) => s.noteFilter);
  const newNotePending = useAppStore((s) => s.newNotePending);
  const consumeNewNote = useAppStore((s) => s.consumeNewNote);
  const setNoteMode = useAppStore((s) => s.setNoteMode);
  const selectNote = useAppStore((s) => s.selectNote);
  const newNoteDraft = useAppStore((s) => s.newNoteDraft);
  const commitDraft = useAppStore((s) => s.commitDraft);
  const deleteNote = useAppStore((s) => s.deleteNote);

  const list = useMemo(
    () => getFilteredNotes(withDraft(notes, noteDraft), noteFilter),
    [notes, noteFilter, noteDraft],
  );

  // The editor shows the in-memory draft when it belongs to the selected note,
  // otherwise the last committed version.
  const note =
    noteDraft && noteDraft.id === currentNoteId
      ? noteDraft
      : (notes.find((n) => n.id === currentNoteId) ?? null);
  const dirty = noteDraft && noteDraft.id === currentNoteId ? isDraftDirty(noteDraft, notes) : false;

  const handleCreate = () => {
    commitDraft();
    newNoteDraft();
    setNoteMode('edit');
    window.setTimeout(() => find.editRef.current?.focus(), 0);
  };

  const handleSelect = (id: number) => {
    if (id === currentNoteId) return;
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

  // Esc cancels editing: it throws the draft away, so the note rolls back to
  // its last saved content and nothing is pending when you switch away. Saving
  // happens only via the save button / ⌘S, or when leaving a note with edits
  // still pending.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const st = useAppStore.getState();
      if (st.noteMode !== 'edit') return;
      e.preventDefault();
      st.discardDraft();
      st.setNoteMode('preview');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Save the current note from anywhere on the page (⌘S / Ctrl+S).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 's') return;
      const ta = e.target as HTMLElement | null;
      if (ta && (ta.id === 'noteFindInput' || ta.id === 'globalSearchInput')) return;
      e.preventDefault();
      useAppStore.getState().commitDraft();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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
            <NoteEditor note={note} find={find} dirty={dirty} />
          )}
        </div>
      </div>
    </section>
  );
}
