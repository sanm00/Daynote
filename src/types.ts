export type Tag = '工作' | '学习' | '生活' | '健康';
export type Priority = 'high' | 'mid' | 'low';
export type TodoSource = 'note' | 'quick';

export interface Task {
  id: number;
  title: string;
  tag: Tag;
  prio: Priority;
  /** `YYYY-MM-DD`, or `null` when unscheduled. */
  date: string | null;
  done: boolean;
  /** Full ISO timestamp of completion, or `null`. */
  doneAt: string | null;
  source?: TodoSource;
  parsedAt?: string;
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
  defaultTag: Tag;
}

export type Page = 'plan' | 'notes' | 'search' | 'review' | 'settings' | 'help';
export type PlanViewKind = 'date' | 'overdue' | 'unscheduled' | 'pending';
export type ReviewRange = 'today' | 'yesterday' | 'week' | 'lastweek' | 'month' | 'lastmonth';
export type ChartType = 'bar' | 'line';
export type ThemeMode = 'light' | 'dark' | 'system';
export type SearchType = 'all' | 'note' | 'task';
