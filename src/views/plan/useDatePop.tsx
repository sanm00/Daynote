import { useCallback, useState } from 'react';
import type { TaskRange } from '@/types';
import { DatePop } from '@/components/DatePop';

interface PopState {
  open: boolean;
  anchorEl: HTMLElement | null;
  value: TaskRange | null;
  allowClear: boolean;
  onPick: (range: TaskRange | null) => void;
}

export interface UseDatePop {
  isOpenFor: (el: HTMLElement) => boolean;
  open: (
    anchor: HTMLElement,
    value: TaskRange | null,
    allowClear: boolean,
    onPick: (range: TaskRange | null) => void,
  ) => void;
  close: () => void;
  host: JSX.Element;
}

/** Single floating date-range picker shared by the quick-add form and task rows. */
export function useDatePop(): UseDatePop {
  const [pop, setPop] = useState<PopState>({
    open: false,
    anchorEl: null,
    value: null,
    allowClear: true,
    onPick: () => {},
  });

  const open = useCallback(
    (
      anchor: HTMLElement,
      value: TaskRange | null,
      allowClear: boolean,
      onPick: (range: TaskRange | null) => void,
    ) => {
      setPop({ open: true, anchorEl: anchor, value, allowClear, onPick });
    },
    [],
  );
  const close = useCallback(() => setPop((p) => ({ ...p, open: false })), []);
  const isOpenFor = useCallback((el: HTMLElement) => pop.open && pop.anchorEl === el, [pop]);

  const host = (
    <DatePop
      open={pop.open}
      anchorRect={pop.anchorEl ? pop.anchorEl.getBoundingClientRect() : null}
      value={pop.value}
      allowClear={pop.allowClear}
      onPick={pop.onPick}
      onClose={close}
    />
  );

  return { isOpenFor, open, close, host };
}
