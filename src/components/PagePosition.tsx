import { useLayoutEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import type { Page } from '@/types';
import { useAppStore } from '@/store';

interface Position {
  context: string;
  scroll: Array<{ selector: string; top: number; left: number }>;
  focus: string | null;
  selection: [number, number] | null;
}

export interface PagePositions {
  pages: Map<Page, Position>;
  previousPage: Page | null;
}

const scrollAreas = '.task-list,.plan-side,.notes-list,.note-render,.note-content-input,.review-scroll,.search-results';
const selectorFor = (el: HTMLElement) => el.id ? `[id=${JSON.stringify(el.id)}]` : `.${el.classList[0]}`;

/** Save DOM positions before a page unmounts; only restore editor/task positions
 * when returning to the same note or plan view, rather than opening a search hit. */
export function PagePosition({ page, positions, children }: {
  page: Page;
  positions: MutableRefObject<PagePositions>;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current!;
    const context = () => root.querySelector<HTMLElement>('[data-position-key]')?.dataset.positionKey ?? '';
    const saved = positions.current.pages.get(page);
    const returningFromSearch = positions.current.previousPage === 'search';
    if (saved) {
      const sameContext = saved.context === context();
      saved.scroll.forEach(({ selector, top, left }) => {
        if (!sameContext && selector !== '.notes-list') return;
        const el = root.querySelector<HTMLElement>(selector);
        if (el) { el.scrollTop = top; el.scrollLeft = left; }
      });
      if (sameContext && returningFromSearch && saved.focus) {
        const target = root.querySelector<HTMLElement>(saved.focus);
        target?.focus({ preventScroll: true });
        if (saved.selection && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
          target.setSelectionRange(...saved.selection);
        }
      }
    }

    return () => {
      const active = document.activeElement;
      const focused = active instanceof HTMLElement && root.contains(active) ? active : null;
      const text = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement ? focused : null;
      positions.current.pages.set(page, {
        // Leaving a new note commits its negative draft ID to a permanent ID.
        context: page === 'notes' ? String(useAppStore.getState().currentNoteId ?? '') : context(),
        scroll: [...root.querySelectorAll<HTMLElement>(scrollAreas)].map((el) => ({
          selector: selectorFor(el), top: el.scrollTop, left: el.scrollLeft,
        })),
        focus: focused && (focused.id || focused.classList.length) ? selectorFor(focused) : null,
        selection: text?.selectionStart != null && text.selectionEnd != null ? [text.selectionStart, text.selectionEnd] : null,
      });
      positions.current.previousPage = page;
    };
  }, [page, positions]);

  return <div className="page-position-host" ref={rootRef}>{children}</div>;
}
