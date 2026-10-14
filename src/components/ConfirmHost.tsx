import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useConfirmStore } from '@/lib/confirm';

/** Renders the active `confirmDialog()` request. Mount once at the app root. */
export function ConfirmHost() {
  const current = useConfirmStore((s) => s.current);
  const settle = useConfirmStore((s) => s.settle);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (!current) return;
    settledRef.current = false;
    confirmRef.current?.focus();

    const done = (value: boolean) => {
      if (settledRef.current) return;
      settledRef.current = true;
      settle(value);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        done(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        done(true);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [current, settle]);

  if (!current) return null;

  const done = (value: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    settle(value);
  };

  return createPortal(
    <div
      className="confirm-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) done(false);
      }}
    >
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-title" id="confirm-title">
          {current.title ?? '请确认'}
        </div>
        <div className="confirm-message">{current.message}</div>
        <div className="confirm-actions">
          <button type="button" className="btn ghost" onClick={() => done(false)}>
            {current.cancelText ?? '取消'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${current.danger ? 'danger' : 'primary'}`}
            onClick={() => done(true)}
          >
            {current.confirmText ?? '确定'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
