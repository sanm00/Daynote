// Stable identifiers; names and colors live in the tag registry.
export type Tag = string;
export interface TagDefinition {
  id: Tag;
  name: string;
  color: string;
}
export type Priority = 'high' | 'mid' | 'low';
export type TodoSource = 'note' | 'quick';

export interface Task {
  id: number;
  title: string;
  tag: Tag;
  prio: Priority;
  /** `YYYY-MM-DD` start day, or `null` when unscheduled. */
  beginDate: string | null;
  /** `YYYY-MM-DD` end day (`>= beginDate`), or `null` when unscheduled. */
  endDate: string | null;
  done: boolean;
  /** Full ISO timestamp of completion, or `null`. */
  doneAt: string | null;
  source?: TodoSource;
  parsedAt?: string;
}

/** An inclusive `YYYY-MM-DD` span used when (re)scheduling a task. */
export interface TaskRange {
  begin: string;
  end: string;
}

export interface Note {
  id: number;
  title: string;
  /** Markdown body. */
  content: string;
  tag: Tag;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: ThemeMode;
  palette: ThemePalette;
  defaultTag: Tag;
}

export type Page = 'plan' | 'notes' | 'search' | 'review' | 'settings' | 'help';
export type PlanViewKind = 'date' | 'overdue' | 'unscheduled' | 'pending';
export type ReviewRange = 'today' | 'yesterday' | 'week' | 'lastweek' | 'month' | 'lastmonth';
export type ChartType = 'bar' | 'line';
export type ThemePalette = 'warm' | 'morandi';
export type ThemeMode = 'light' | 'dark' | 'system';
export type SearchType = 'all' | 'note' | 'task';
