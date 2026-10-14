import { create } from 'zustand';

export interface ConfirmOptions {
  /** Heading, e.g. the action name. Defaults to `请确认`. */
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmStore {
  current: PendingConfirm | null;
  queue: PendingConfirm[];
  enqueue: (item: PendingConfirm) => void;
  settle: (value: boolean) => void;
}

/**
 * Drives the single `<ConfirmHost />` mounted at the app root. A queue keeps
 * overlapping calls honest while the visible dialog is modal.
 */
export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  current: null,
  queue: [],
  enqueue: (item) => set((s) => (s.current ? { queue: [...s.queue, item] } : { current: item })),
  settle: (value) => {
    const { current, queue } = get();
    current?.resolve(value);
    const [next, ...rest] = queue;
    set({ current: next ?? null, queue: rest });
  },
}));

/**
 * In-app replacement for `window.confirm`. Unlike the native dialog it can't
 * run before the user answers (WKWebView's `confirm` resolves early), and it
 * matches the app's styling.
 */
export function confirmDialog(options: string | ConfirmOptions): Promise<boolean> {
  const opts = typeof options === 'string' ? { message: options } : options;
  return new Promise<boolean>((resolve) => {
    useConfirmStore.getState().enqueue({ ...opts, resolve });
  });
}
