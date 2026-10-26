import type { Note, Task } from '@/types';
import iconUrl from '@/assets/daynote-icon.svg';
import exampleNote from './example-note.md?raw';
import { addDays, fmt, today } from './date';

/** Minimal first-run examples for production builds, dated at first launch. */
export function generateStarterTasks(): Task[] {
  const start = today();
  const beginDate = fmt(start);
  return [
    {
      id: 1,
      title: '示例待办：安排今天的一件事',
      tag: '生活',
      prio: 'mid',
      beginDate,
      endDate: beginDate,
      done: false,
      doneAt: null,
    },
    {
      id: 2,
      title: '示例待办：推进跨天计划',
      tag: '工作',
      prio: 'mid',
      beginDate,
      endDate: fmt(addDays(start, 1)),
      done: false,
      doneAt: null,
    },
  ];
}

export function generateStarterNotes(): Note[] {
  const timestamp = new Date().toISOString();
  return [{
    id: 1,
    title: '示例笔记',
    content: exampleNote.replace('{{icon}}', iconUrl),
    tag: '学习',
    createdAt: timestamp,
    updatedAt: timestamp,
  }];
}
