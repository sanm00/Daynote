import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { Titlebar } from '@/components/Titlebar';
import { Sidebar } from '@/components/Sidebar';
import { ConfirmHost } from '@/components/ConfirmHost';
import { PagePosition, type PagePositions } from '@/components/PagePosition';
import { PlanView } from '@/views/plan/PlanView';
import { NotesView } from '@/views/notes/NotesView';
import { ReviewView } from '@/views/review/ReviewView';
import { SearchView } from '@/views/search/SearchView';
import { SettingsView } from '@/views/settings/SettingsView';
import { HelpView } from '@/views/help/HelpView';

export function App() {
  const positions = useRef<PagePositions>({ pages: new Map(), previousPage: null });
  const page = useAppStore((s) => s.page);
  const ready = useAppStore((s) => s.ready);
  const applyTheme = useAppStore((s) => s.applyTheme);
  const openSearch = useAppStore((s) => s.openSearch);
  const requestNewTodo = useAppStore((s) => s.requestNewTodo);
  const requestNewNote = useAppStore((s) => s.requestNewNote);

  useEffect(() => {
    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (useAppStore.getState().settings.theme === 'system') applyTheme();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [applyTheme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        requestNewTodo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        requestNewNote();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openSearch, requestNewTodo, requestNewNote]);

  if (!ready) return <div className="window" />;

  return (
    <div className="window">
      <div className="app-body">
        <div className="side-col">
          <Titlebar />
          <Sidebar />
        </div>
        <main className="content">
          <PagePosition key={page} page={page} positions={positions}>
            {page === 'plan' && <PlanView />}
            {page === 'notes' && <NotesView />}
            {page === 'review' && <ReviewView />}
            {page === 'search' && <SearchView />}
            {page === 'settings' && <SettingsView />}
            {page === 'help' && <HelpView />}
          </PagePosition>
        </main>
      </div>
      <ConfirmHost />
    </div>
  );
}
