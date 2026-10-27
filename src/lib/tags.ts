import type { Tag, TagDefinition } from '@/types';

export const TAG_ORDER: Tag[] = ['工作', '学习', '生活', '健康'];

export const TAG_COLORS = ['work', 'study', 'life', 'health', 'blue', 'rose', 'slate', 'cyan'] as const;
export const TAG_COLOR_NAMES = ['陶土', '紫色', '琥珀', '绿色', '蓝色', '粉色', '灰色', '青色'];
export const defaultTags = (): TagDefinition[] => TAG_ORDER.map((name, i) => ({ id: name, name, color: TAG_COLORS[i] }));

export function validateTags(input: unknown): TagDefinition[] {
  if (!Array.isArray(input) || !input.length) throw new Error('至少保留一个标签');
  const ids = new Set<string>(), names = new Set<string>();
  return input.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('标签格式无效');
    const tag = raw as Record<string, unknown>;
    const name = typeof tag.name === 'string' ? tag.name.trim() : '';
    if (typeof tag.id !== 'string' || !/^[\p{L}\p{N}_-]+$/u.test(tag.id) || tag.id === 'all' || ids.has(tag.id)) throw new Error('标签 ID 无效或重复');
    if (!name || [...name].length > 20 || names.has(name.toLocaleLowerCase())) throw new Error('标签名称需要 1～20 个字符，且不能重复');
    ids.add(tag.id); names.add(name.toLocaleLowerCase());
    return { id: tag.id, name, color: TAG_COLORS.includes(tag.color as typeof TAG_COLORS[number]) ? String(tag.color) : 'work' };
  });
}
