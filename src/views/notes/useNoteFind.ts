import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';

export interface NoteFind {
  open: boolean;
  query: string;
  caseOn: boolean;
  hits: number;
  index: number;
  renderRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  titleRef: React.RefObject<HTMLInputElement>;
  editRef: React.RefObject<HTMLTextAreaElement>;
  openFind: () => void;
  close: () => void;
  setQuery: (q: string) => void;
  toggleCase: () => void;
  step: (delta: number) => void;
  onDelete: () => void;
}

/** In-body text find for the note preview (⌘F): highlights <mark> hits in the
 * rendered DOM and walks them. Closes when switching to edit mode. */
/** Params: contentKey re-runs find on content edits; editCaret focuses the
 * editor caret at end; onDelete wires the delete button. */
export function useNoteFind(
  contentKey: string | number | undefined,
  handlers: { onDelete: () => void },
): NoteFind {
  const { onDelete } = handlers;
  const currentNoteId = useAppStore((s) => s.currentNoteId);
  const noteMode = useAppStore((s) => s.noteMode);
  const setNoteMode = useAppStore((s) => s.setNoteMode);

  const renderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const marksRef = useRef<HTMLElement[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [caseOn, setCaseOn] = useState(false);
  const [hits, setHits] = useState(0);
  const [index, setIndex] = useState(0);

  const clear = useCallback(() => {
    const rn = renderRef.current;
    if (!rn) return;
    rn.querySelectorAll('mark.nf-hit').forEach((m) =>
      m.replaceWith(document.createTextNode(m.textContent ?? '')),
    );
    rn.normalize();
    marksRef.current = [];
  }, []);

  const run = useCallback(() => {
    clear();
    const rn = renderRef.current;
    if (!rn || !query) {
      setHits(0);
      setIndex(0);
      return;
    }
    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseOn ? 'g' : 'gi');
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
    const found = [...rn.querySelectorAll<HTMLElement>('mark.nf-hit')];
    marksRef.current = found;
    setHits(found.length);
    setIndex(0);
    if (found.length) {
      found.forEach((el, k) => el.classList.toggle('active', k === 0));
      found[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [query, caseOn, clear]);

  const step = useCallback(
    (delta: number) => {
      const els = marksRef.current;
      if (!els.length) return;
      const next = (((index + delta) % els.length) + els.length) % els.length;
      setIndex(next);
      els.forEach((el, k) => el.classList.toggle('active', k === next));
      els[next].scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    [index],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    clear();
  }, [clear]);

  const openFind = useCallback(() => {
    if (!currentNoteId) return;
    if (noteMode !== 'preview') setNoteMode('preview');
    setOpen(true);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [currentNoteId, noteMode, setNoteMode]);

  useEffect(() => {
    if (open && noteMode === 'preview') run();
  }, [open, query, caseOn, contentKey, noteMode, run]);

  useEffect(() => {
    if (noteMode === 'edit' && open) close();
  }, [noteMode, open, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const ta = e.target as HTMLElement | null;
        if (ta && (ta.id === 'noteFindInput' || ta.id === 'globalSearchInput')) return;
        e.preventDefault();
        openFind();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openFind, open, close]);

  return {
    open,
    query,
    caseOn,
    hits,
    index,
    renderRef,
    inputRef,
    titleRef,
    editRef,
    openFind,
    close,
    setQuery,
    toggleCase: () => setCaseOn((v) => !v),
    step,
    onDelete,
  };
}

/** ⌘E / Ctrl+E switches the current note into edit mode with the caret at the
 * end of the body. Registered with no deps so StrictMode's double-mount cannot
 * stack listeners. */
export function useEditShortcut(editRef: React.RefObject<HTMLTextAreaElement | null>) {
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
        const el = editRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 0);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
