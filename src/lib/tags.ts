import type { Tag } from '@/types';

export const TAG_ORDER: Tag[] = ['工作', '学习', '生活', '健康'];

export const TAG_STYLE: Record<Tag, { bar: string }> = {
  工作: { bar: 'linear-gradient(90deg, var(--tag-work), var(--tag-work-fg))' },
  学习: { bar: 'linear-gradient(90deg, var(--tag-study), var(--tag-study-fg))' },
  生活: { bar: 'linear-gradient(90deg, var(--tag-life), var(--tag-life-fg))' },
  健康: { bar: 'linear-gradient(90deg, var(--tag-health), var(--tag-health-fg))' },
};

export const TAG_DOT: Record<Tag, string> = {
  工作: 'var(--tag-work)',
  学习: 'var(--tag-study)',
  生活: 'var(--tag-life)',
  健康: 'var(--tag-health)',
};

export function nextTag(tag: Tag): Tag {
  const i = TAG_ORDER.indexOf(tag);
  return TAG_ORDER[(i + 1) % TAG_ORDER.length];
}
