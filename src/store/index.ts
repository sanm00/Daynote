import { create } from 'zustand';
import { createDataSlice } from './dataSlice';
import { createUiSlice } from './uiSlice';
import { createPersistSlice } from './persistSlice';
import type { AppStore } from './types';

export const useAppStore = create<AppStore>((...a) => ({
  ...createDataSlice(...a),
  ...createUiSlice(...a),
  ...createPersistSlice(...a),
}));

export type { AppStore, PlanView } from './types';
export { setupAutoPersist, flushPersist } from './autosave';
