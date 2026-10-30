import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/demo.css';
import './styles/tags.css';
import './styles/app.css';
import './styles/warm-dark.css';
import './styles/morandi.css';
import './styles/appearance.css';
import './styles/calendar.css';
import './styles/layout.css';
import { App } from '@/App';
import { flushPersist, setupAutoPersist, useAppStore } from '@/store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__store = useAppStore;

void useAppStore
  .getState()
  .hydrateFromStorage()
  .finally(() => {
    setupAutoPersist();
    const onBeforeUnload = () => {
      useAppStore.getState().commitDraft();
      flushPersist();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPersist();
    });
  });
