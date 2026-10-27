import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { TAG_COLORS, TAG_COLOR_NAMES } from '@/lib/tags';
import type { TagDefinition } from '@/types';

type Draft = Omit<TagDefinition, 'id'> & { id?: string };

function TagEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const saveTag = useAppStore(s => s.saveTag);
  const [name, setName] = useState(draft.name);
  const [color, setColor] = useState(draft.color);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  const save = () => {
    try { saveTag({ name, color }, draft.id); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); input.current?.focus(); }
  };
  return <div className="custom-tag-editor rename-body" role="group" aria-label={draft.id ? '编辑标签' : '新建标签'}
    onKeyDown={e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'Enter' && e.target === input.current && !e.nativeEvent.isComposing) { e.preventDefault(); save(); }
    }}>
    <input ref={input} className="task-title-input" aria-label="标签名称" placeholder="标签名称" maxLength={40}
      value={name} aria-invalid={!!error} onChange={e => {setName(e.target.value); setError('');}} />
    <div className="custom-tag-swatches" role="group" aria-label="标签颜色">
      {TAG_COLORS.map((c, i) => <button key={c} type="button" aria-label={TAG_COLOR_NAMES[i]} aria-pressed={color === c}
        style={{ background: `var(--tag-${c})` }} onClick={() => setColor(c)} />)}
    </div>
    <div className="rename-actions">
      <button className="chip" onClick={save}>{draft.id ? '保存' : '添加'}</button>
      <button className="chip ghost" onClick={onClose}>取消</button>
      <span className="custom-tag-keyhint">Enter 保存 · Esc 取消</span>
    </div>
    {error && <div className="custom-tag-error" role="alert">{error}</div>}
  </div>;
}

function DeleteTag({ tag, onClose }: {tag: TagDefinition; onClose: () => void}) {
  const tags = useAppStore(s => s.tags);
  const defaultTag = useAppStore(s => s.settings.defaultTag);
  const tasks = useAppStore(s => s.tasks);
  const notes = useAppStore(s => s.notes);
  const draft = useAppStore(s => s.noteDraft);
  const deleteTag = useAppStore(s => s.deleteTag);
  const choices = tags.filter(t => t.id !== tag.id);
  const [replacement, setReplacement] = useState(choices.find(t => t.id === defaultTag)?.id ?? choices[0]?.id ?? '');
  const count = tasks.filter(t => t.tag === tag.id).length + notes.filter(n => n.tag === tag.id).length;
  return <div className="custom-tag-delete" onKeyDown={e => {if (e.key === 'Escape') {e.stopPropagation();onClose();}}}>
    <p>{count ? `${count} 条记录将迁移到所选标签。` : '确定删除这个标签？'}{draft?.tag === tag.id && '当前笔记草稿也会迁移。'}{defaultTag === tag.id && '所选标签也将成为默认标签。'}</p>
    <label>迁移到 <select aria-label="替代标签" value={replacement} onChange={e => setReplacement(e.target.value)}>
      {choices.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select></label>
    <div className="rename-actions"><button className="chip" onClick={() => {deleteTag(tag.id, replacement);onClose();}}>确认删除</button><button className="chip ghost" onClick={onClose}>取消</button></div>
  </div>;
}

export function TagManager() {
  const tags = useAppStore(s => s.tags);
  const tasks = useAppStore(s => s.tasks);
  const notes = useAppStore(s => s.notes);
  const defaultTag = useAppStore(s => s.settings.defaultTag);
  const setDefaultTag = useAppStore(s => s.setDefaultTag);
  const moveTag = useAppStore(s => s.moveTag);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const closeEditor = () => {setDraft(null);newButton.current?.focus();};
  return <div className="card setting-card" id="tagManager">
    <div className="custom-tag-heading"><div><div className="setting-title">标签管理</div><div className="setting-desc">任务和笔记共用，默认标签用于新建任务和笔记</div></div>
      <button ref={newButton} className="btn ghost" onClick={() => {setDeleting(null);setDraft({name:'',color:'work'});}}>＋ 新建标签</button>
    </div>
    {draft && !draft.id && <div className="custom-tag-row custom-tag-edit-row"><TagEditor key="new" draft={draft} onClose={closeEditor} /></div>}
    <div id="tagList">{tags.map((tag, i) => <div className="custom-tag-item" data-id={tag.id} key={tag.id}>
      {draft?.id === tag.id ? <div className="custom-tag-row custom-tag-edit-row"><TagEditor key={tag.id} draft={draft} onClose={closeEditor} /></div> : <div className="custom-tag-row">
        <i style={{ background:`var(--tag-${tag.color})` }} /><div className="custom-tag-info"><b>{tag.name}</b><small>{tasks.filter(t=>t.tag === tag.id).length + notes.filter(n=>n.tag === tag.id).length} 条记录</small></div>
        <div className="custom-tag-actions">
          <button className={defaultTag === tag.id ? 'is-default' : ''} disabled={defaultTag === tag.id} onClick={() => setDefaultTag(tag.id)} aria-label={`${defaultTag === tag.id ? '默认标签' : '设为默认'}：${tag.name}`}>{defaultTag === tag.id ? '默认标签' : '设为默认'}</button>
          <button disabled={i === 0} aria-label={`上移 ${tag.name}`} onClick={() => moveTag(tag.id,-1)}>↑</button>
          <button disabled={i === tags.length - 1} aria-label={`下移 ${tag.name}`} onClick={() => moveTag(tag.id,1)}>↓</button>
          <button onClick={() => {setDeleting(null);setDraft({...tag});}}>编辑</button>
          <button disabled={tags.length === 1} title={tags.length === 1 ? '至少保留一个标签' : undefined} onClick={() => {setDraft(null);setDeleting(tag.id);}}>删除</button>
        </div>
      </div>}
      {deleting === tag.id && <DeleteTag tag={tag} onClose={() => setDeleting(null)} />}
    </div>)}</div>
  </div>;
}
