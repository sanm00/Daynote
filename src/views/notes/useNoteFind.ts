import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';

export interface NoteFind {
  open: boolean;
  query: string;
  caseOn: boolean;
  hits: number;
  index: number;
  /** Escaped HTML of the raw Markdown with <mark> wrapped hits, for the edit-mode
   * backdrop that mirrors the textarea. Empty when editing has no active find. */
  editHighlight: string;
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

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** In-body text find for a note (⌘F). In preview it highlights <mark> hits in
 * the rendered DOM and walks them; in edit mode it walks matches in the raw
 * Markdown and selects the active one in the textarea. */
/** Params: contentKey re-runs find on content edits; editCaret focuses the
 * editor caret at end; onDelete wires the delete button. */
export function useNoteFind(
  contentKey: string | number | undefined,
  handlers: { onDelete: () => void },
): NoteFind {
  const { onDelete } = handlers;
  const currentNoteId = useAppStore((s) => s.currentNoteId);
  const noteMode = useAppStore((s) => s.noteMode);

  const renderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const marksRef = useRef<HTMLElement[]>([]);
  const editRanges = useRef<Array<{ start: number; end: number }>>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [caseOn, setCaseOn] = useState(false);
  const [hits, setHits] = useState(0);
  const [index, setIndex] = useState(0);

  const editHighlight = useMemo(() => {
    if (noteMode !== 'edit' || !open || !query) return '';
    const content = typeof contentKey === 'string' ? contentKey : '';
    const re = new RegExp(escapeRe(query), caseOn ? 'g' : 'gi');
    let html = '';
    let last = 0;
    let k = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      html += escapeHtml(content.slice(last, m.index));
      html += `<mark class="nf-hit${k === index ? ' active' : ''}">${escapeHtml(m[0])}</mark>`;
      last = m.index + m[0].length;
      k++;
      if (!m[0]) re.lastIndex++;
    }
    return html + escapeHtml(content.slice(last));
  }, [noteMode, open, query, caseOn, contentKey, index]);

  const clear = useCallback(() => {
    const rn = renderRef.current;
    if (!rn) return;
    rn.querySelectorAll('mark.nf-hit').forEach((m) =>
      m.replaceWith(document.createTextNode(m.textContent ?? '')),
    );
    rn.normalize();
    marksRef.current = [];
  }, []);

  // Selects a match in the textarea, scrolls it into view, then returns focus
  // to the find box so Enter keeps stepping through hits.
  const revealEditRange = useCallback((range: { start: number; end: number }) => {
    const el = editRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(range.start, range.end);
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const line = (el.value.slice(0, range.start).match(/\n/g)?.length ?? 0);
    el.scrollTop = Math.max(0, line * lineHeight - el.clientHeight / 2 + lineHeight / 2);
    inputRef.current?.focus();
  }, []);

  const run = useCallback(() => {
    clear();
    if (!query) {
      editRanges.current = [];
      setHits(0);
      setIndex(0);
      return;
    }
    if (noteMode === 'edit') {
      const content = typeof contentKey === 'string' ? contentKey : '';
      const re = new RegExp(escapeRe(query), caseOn ? 'g' : 'gi');
      const ranges: Array<{ start: number; end: number }> = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(content))) {
        ranges.push({ start: m.index, end: m.index + m[0].length });
        if (!m[0]) re.lastIndex++;
      }
      editRanges.current = ranges;
      setHits(ranges.length);
      if (!ranges.length) {
        setIndex(0);
        return;
      }
      // While typing in the body, keep the caret where it is and just recount.
      if (editRef.current === document.activeElement) {
        setIndex((i) => Math.min(i, ranges.length - 1));
        return;
      }
      setIndex(0);
      revealEditRange(ranges[0]);
      return;
    }
    const rn = renderRef.current;
    if (!rn) {
      setHits(0);
      setIndex(0);
      return;
    }
    const re = new RegExp(escapeRe(query), caseOn ? 'g' : 'gi');
    const walker = document.createTreeWalker(rn, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('mark.nf-hit')) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('.code-copy-btn')) return NodeFilter.FILTER_REJECT;
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
  }, [query, caseOn, clear, noteMode, contentKey, revealEditRange]);

  const step = useCallback(
    (delta: number) => {
      if (noteMode === 'edit') {
        const ranges = editRanges.current;
        if (!ranges.length) return;
        const next = (((index + delta) % ranges.length) + ranges.length) % ranges.length;
        setIndex(next);
        revealEditRange(ranges[next]);
        return;
      }
      const els = marksRef.current;
      if (!els.length) return;
      const next = (((index + delta) % els.length) + els.length) % els.length;
      setIndex(next);
      els.forEach((el, k) => el.classList.toggle('active', k === next));
      els[next].scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    [index, noteMode, revealEditRange],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    editRanges.current = [];
    clear();
  }, [clear]);

  const openFind = useCallback(() => {
    if (!currentNoteId) return;
    setOpen(true);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [currentNoteId]);

  useEffect(() => {
    if (open) run();
  }, [open, query, caseOn, contentKey, noteMode, run]);

  // Stable registration: re-registering on every `open` change would move this
  // listener after the editor's Escape handler and let it discard the draft.
  const openRef = useRef(open);
  openRef.current = open;
  const closeRef = useRef(close);
  closeRef.current = close;
  const openFindRef = useRef(openFind);
  openFindRef.current = openFind;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const ta = e.target as HTMLElement | null;
        if (ta && (ta.id === 'noteFindInput' || ta.id === 'globalSearchInput')) return;
        e.preventDefault();
        openFindRef.current();
      } else if (e.key === 'Escape' && openRef.current) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return {
    open,
    query,
    caseOn,
    hits,
    index,
    editHighlight,
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
