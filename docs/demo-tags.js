/* Shared custom-label interactions for the two standalone demos. */
const DEMO_TAG_STORAGE = location.pathname.endsWith('demo-official.html') ? 'daynote-demo-official-tags-v1' : 'daynote-demo-preview-tags-v1';
const DEMO_TAG_COLORS = ['work','study','life','health','blue','rose','slate','cyan'];
let demoTags = ['工作','学习','生活','健康'].map((name, i) => ({id:name, name, color:DEMO_TAG_COLORS[i]}));
const tagLabel = id => demoTags.find(t => t.id === id)?.name || id;
const tagText = id => String(tagLabel(id)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const availableTags = () => demoTags;
function validateDemoTags(value){
  if(!Array.isArray(value) || !value.length) throw new Error('标签列表不能为空');
  const ids = new Set(), names = new Set();
  const result = value.map(t => {
    if(!t || typeof t.id !== 'string' || !/^(工作|学习|生活|健康|tag-[a-z0-9-]+)$/.test(t.id)) throw new Error('标签 ID 无效');
    const name = typeof t.name === 'string' ? t.name.trim() : '';
    if(!name || [...name].length > 20 || names.has(name.toLocaleLowerCase()) || ids.has(t.id)) throw new Error('标签名称或 ID 重复、无效');
    names.add(name.toLocaleLowerCase()); ids.add(t.id);
    return {id:t.id, name, color:DEMO_TAG_COLORS.includes(t.color) ? t.color : 'work'};
  });
  return result;
}
function prepareDemoTags(data){
  const next = data.tags ? validateDemoTags(data.tags) : ['工作','学习','生活','健康'].map((name,i) => ({id:name,name,color:DEMO_TAG_COLORS[i]}));
  const ids = new Set(next.map(t => t.id));
  for(const row of [...(data.tasks || []), ...(data.notes || [])]){
    if(!row || !ids.has(row.tag)) throw new Error('记录引用了不存在的标签');
  }
  demoTags = next;
  if(!availableTags().some(t => t.id === data.settings?.defaultTag)) settings.defaultTag = availableTags()[0].id;
  refreshDemoTagControls();
}
function persistDemoTags(){
  try{ localStorage.setItem(DEMO_TAG_STORAGE, JSON.stringify({tags:demoTags, tasks, notes, defaultTag:settings.defaultTag})); }catch(e){ toast('浏览器存储不可用，请导出备份'); }
}
function refreshDemoTagControls(){
  TAG_ORDER.splice(0, TAG_ORDER.length, ...availableTags().map(t => t.id));
  if(!TAG_ORDER.includes(settings.defaultTag)) settings.defaultTag = TAG_ORDER[0];
  if(!TAG_ORDER.includes(state.addTag)) state.addTag = settings.defaultTag;
  const style = document.getElementById('customTagColors') || document.head.appendChild(Object.assign(document.createElement('style'),{id:'customTagColors'}));
  style.textContent = demoTags.map(t => {
    TAG_DOT[t.id] = `var(--tag-${t.color})`;
    TAG_STYLE[t.id] = {bar:`var(--tag-${t.color})`};
    return `.tag[data-tag="${t.id}"],.filter-chip[data-filter="${t.id}"],.note-tag-chip.active[data-tag="${t.id}"]{background:var(--tag-${t.color}-bg);color:var(--tag-${t.color}-fg)}`;
  }).join('\n');
  document.getElementById('tagMenu').innerHTML = TAG_ORDER.map(id => `<button type="button" data-tag="${id}"><i style="background:${TAG_DOT[id]}"></i>${tagText(id)}</button>`).join('');
  document.querySelectorAll('#noteFilter [data-filter]:not([data-filter="all"])').forEach(el => el.remove());
  document.querySelector('#noteFilter [data-filter="all"]').classList.toggle('active',state.noteFilter === 'all');
  document.getElementById('noteFilter').insertAdjacentHTML('beforeend', demoTags.map(t => `<button class="filter-chip${state.noteFilter === t.id ? ' selected' : ''}" data-filter="${t.id}">${tagText(t.id)}</button>`).join(''));
}
let demoManagerDraft = null;
let demoManagerDeleteId = null;

function tagEditorMarkup(draft){
  return `<div class="custom-tag-editor rename-body" role="group" aria-label="${draft.id ? '编辑标签' : '新建标签'}">
    <input class="task-title-input" data-tag-name aria-label="标签名称" placeholder="标签名称" maxlength="40" autocomplete="off" value="${escapeHtml(draft.name)}">
    <div class="custom-tag-swatches" role="group" aria-label="标签颜色">${DEMO_TAG_COLORS.map((color,i) => `<button type="button" data-color="${color}" aria-label="${['陶土','紫色','琥珀','绿色','蓝色','粉色','灰色','青色'][i]}" aria-pressed="${draft.color === color}" style="--swatch:var(--tag-${color})"></button>`).join('')}</div>
    <div class="rename-actions"><button type="button" class="chip" data-tag-save>${draft.id ? '保存' : '添加'}</button><button type="button" class="chip ghost" data-tag-cancel>取消</button><span class="custom-tag-keyhint">Enter 保存 · Esc 取消</span></div>
    <div class="custom-tag-error" role="alert" hidden></div>
  </div>`;
}

function mountDemoTagEditor(host, draft, onSaved, onCancel, focus = true){
  host.innerHTML = tagEditorMarkup(draft);
  const input = host.querySelector('[data-tag-name]');
  const error = message => {
    const el = host.querySelector('[role="alert"]');
    el.hidden = false; el.textContent = message; input.setAttribute('aria-invalid','true'); input.focus();
  };
  const save = () => {
    const name = input.value.trim();
    if(!name || [...name].length > 20) return error('名称需要 1～20 个字符');
    if(demoTags.some(t => t.id !== draft.id && t.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return error('标签名称已存在');
    const tag = demoTags.find(t => t.id === draft.id);
    const id = tag?.id || `tag-${crypto.randomUUID()}`;
    if(tag) Object.assign(tag, {name, color:draft.color});
    else demoTags.push({id, name, color:draft.color});
    onSaved(id); commitDemoTags();
  };
  input.oninput = () => {draft.name = input.value; input.removeAttribute('aria-invalid'); host.querySelector('[role="alert"]').hidden = true;};
  host.onclick = e => {
    e.stopPropagation();
    const color = e.target.closest('[data-color]');
    if(color){
      draft.color = color.dataset.color;
      host.querySelectorAll('[data-color]').forEach(btn => btn.setAttribute('aria-pressed', String(btn === color)));
    } else if(e.target.closest('[data-tag-save]')) save();
    else if(e.target.closest('[data-tag-cancel]')) onCancel();
  };
  host.onkeydown = e => {
    e.stopPropagation();
    if(e.key === 'Escape'){ e.preventDefault(); onCancel(); }
    else if(e.key === 'Enter' && e.target === input && !e.isComposing){ e.preventDefault(); save(); }
  };
  if(focus){input.focus();input.select();}
}

function renderDemoTagManager(focus = false){
  const target = document.getElementById('demoTagList');
  if(!target) return;
  const newEditor = demoManagerDraft?.id === null ? '<div class="custom-tag-row custom-tag-edit-row"><div data-manager-editor></div></div>' : '';
  target.innerHTML = newEditor + demoTags.map((t,i) => {
    const count = tasks.filter(r => r.tag === t.id).length + notes.filter(r => r.tag === t.id).length;
    if(demoManagerDraft?.id === t.id) return `<div class="custom-tag-row custom-tag-edit-row" data-id="${t.id}"><div data-manager-editor></div></div>`;
    const deleting = demoManagerDeleteId === t.id;
    return `<div class="custom-tag-item" data-id="${t.id}"><div class="custom-tag-row"><i style="background:var(--tag-${t.color})"></i><div class="custom-tag-info"><b>${tagText(t.id)}</b><small>${count} 条记录</small></div><div class="custom-tag-actions"><button type="button" data-action="default" class="${settings.defaultTag === t.id ? 'is-default' : ''}" ${settings.defaultTag === t.id ? 'disabled' : ''} aria-label="${settings.defaultTag === t.id ? '默认标签：' : '设为默认：'}${tagText(t.id)}">${settings.defaultTag === t.id ? '默认标签' : '设为默认'}</button><button type="button" data-action="up" ${i===0?'disabled':''} aria-label="上移 ${tagText(t.id)}">↑</button><button type="button" data-action="down" ${i===demoTags.length-1?'disabled':''} aria-label="下移 ${tagText(t.id)}">↓</button><button type="button" data-action="edit">编辑</button><button type="button" data-action="delete" ${demoTags.length === 1 ? 'disabled title="至少保留一个标签"' : ''}>删除</button></div></div>
      ${deleting ? `<div class="custom-tag-delete"><p>${count ? `${count} 条记录将迁移到所选标签。` : '确定删除这个标签？'}${settings.defaultTag === t.id ? '所选标签也将成为默认标签。' : ''}</p>${count || settings.defaultTag === t.id ? `<label>迁移到 <select data-replacement aria-label="替代标签">${demoTags.filter(x=>x.id!==t.id).map(x=>`<option value="${x.id}" ${x.id === settings.defaultTag ? 'selected' : ''}>${tagText(x.id)}</option>`).join('')}</select></label>` : ''}<div class="rename-actions"><button type="button" class="chip" data-action="confirm-delete">确认删除</button><button type="button" class="chip ghost" data-action="cancel-delete">取消</button></div></div>` : ''}</div>`;
  }).join('');
  const host = target.querySelector('[data-manager-editor]');
  if(host) mountDemoTagEditor(host, demoManagerDraft, () => {demoManagerDraft = null;}, () => {demoManagerDraft = null;renderDemoTagManager();document.getElementById('demoNewTag').focus();}, focus);
}

function commitDemoTags(){
  refreshDemoTagControls(); saveSettings();
  renderPlan(); renderReview(); renderNotes(); renderSettings();
  if(state.page === 'search') renderGlobalSearch();
  persistDemoTags();
}

function openDemoTagDropdown(anchor, task, onSelect){
  document.getElementById('demoTagDropdown')?.dismiss?.();
  const picker = document.createElement('div'); picker.id = 'demoTagDropdown'; picker.className = 'tag-menu open custom-tag-picker';
  picker.setAttribute('role','group'); picker.setAttribute('aria-label','选择标签');
  picker.innerHTML = `<div class="custom-tag-options">${demoTags.map(t=>`<button type="button" data-tag="${t.id}" aria-pressed="${task.tag===t.id}"><i style="background:var(--tag-${t.color})"></i>${tagText(t.id)}${task.tag===t.id?' ✓':''}</button>`).join('')}</div>`;
  const close = () => {document.removeEventListener('pointerdown',outside);picker.remove();anchor.setAttribute('aria-expanded','false');anchor?.focus();};
  picker.dismiss = close;
  anchor.setAttribute('aria-expanded','true');
  const outside = e => {if(!picker.contains(e.target) && !anchor.contains(e.target)) close();};
  picker.onclick = e => {
    const btn = e.target.closest('button'); if(!btn) return;
    if(btn.dataset.tag){onSelect(btn.dataset.tag);close();}

  };
  picker.onkeydown = e => {if(e.key === 'Escape'){e.stopPropagation();close();}};
  document.body.appendChild(picker);
  const rect = anchor.getBoundingClientRect();
  picker.style.left = Math.max(8,Math.min(rect.left,window.innerWidth - 328)) + 'px';
  picker.style.top = Math.max(8,Math.min(rect.bottom + 6,window.innerHeight - 340)) + 'px';
  document.addEventListener('pointerdown',outside);
  picker.querySelector('[aria-pressed="true"]')?.focus();
}
function initDemoTags(){
  try{
    const data = JSON.parse(localStorage.getItem(DEMO_TAG_STORAGE) || 'null');
    if(data){prepareDemoTags(data); tasks.splice(0,tasks.length,...data.tasks);notes.splice(0,notes.length,...data.notes);settings.defaultTag=data.defaultTag || settings.defaultTag;uid=Math.max(0,...tasks.map(t=>t.id))+1;noteUid=Math.max(0,...notes.map(n=>n.id))+1;state.currentNoteId=notes[0]?.id || null;}
  }catch(e){console.warn('自定义标签备份未能恢复', e);}
  const card = document.getElementById('demoTagManager');
  const heading = card.querySelector('.setting-title');
  heading.outerHTML = '<div class="custom-tag-heading"><div><div class="setting-title">标签管理</div><div class="setting-desc">任务和笔记共用，默认标签用于新建任务和笔记</div></div><button type="button" class="btn ghost" id="demoNewTag">＋ 新建标签</button></div>';
  card.insertAdjacentHTML('beforeend','<div id="demoTagList"></div>');
  document.getElementById('demoNewTag').onclick = () => {demoManagerDraft = {id:null,name:'',color:'work'};demoManagerDeleteId = null;renderDemoTagManager(true);};
  card.addEventListener('click',e => {
    const btn = e.target.closest('[data-action]'); if(!btn || btn.disabled) return;
    const id = btn.closest('[data-id]').dataset.id;
    const tag = demoTags.find(t=>t.id === id), action = btn.dataset.action;
    if(action === 'default'){
      settings.defaultTag = id;state.addTag = id;
      commitDemoTags();
      toast(`默认标签已设为「${tagLabel(id)}」`);
      return;
    }
    if(action === 'edit'){
      demoManagerDeleteId = null;demoManagerDraft = {id,name:tag.name,color:tag.color};renderDemoTagManager(true);return;
    }
    if(action === 'delete' || action === 'cancel-delete'){
      demoManagerDraft = null;demoManagerDeleteId = action === 'delete' ? id : null;renderDemoTagManager();return;
    }
    if(action === 'confirm-delete'){
      if(demoTags.length === 1) return;
      const replacement = btn.closest('[data-id]').querySelector('[data-replacement]')?.value || demoTags.find(t=>t.id !== id).id;
      [...tasks,...notes].forEach(row => {if(row.tag === id) row.tag = replacement;});
      if(settings.defaultTag === id) settings.defaultTag = replacement;
      if(state.noteFilter === id) state.noteFilter = 'all';
      demoTags = demoTags.filter(t=>t.id !== id);demoManagerDeleteId = null;
    } else {
      const i = demoTags.indexOf(tag), j = i + (action === 'up' ? -1 : 1);
      if(j < 0 || j >= demoTags.length) return;
      [demoTags[i],demoTags[j]] = [demoTags[j],demoTags[i]];
    }
    commitDemoTags();
  });
  refreshDemoTagControls();
  window.addEventListener('pagehide',persistDemoTags);
  let timer;document.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(persistDemoTags,500);});
  document.addEventListener('click',()=>{clearTimeout(timer);timer=setTimeout(persistDemoTags,50);});
}

function setupDemoNoteTagPicker(){
  document.getElementById('demoTagDropdown')?.dismiss?.();
  const trigger = document.querySelector('[data-note-tag-trigger]');
  const noteId = state.currentNoteId;
  if(!trigger) return;
  trigger.onclick = () => {
    const note = notes.find(n => n.id === noteId);
    if(!note) return;
    openDemoTagDropdown(trigger, note, tag => {
      note.tag = tag;
      note.updatedAt = new Date().toISOString();
      trigger.querySelector('span').textContent = tagLabel(tag);
      trigger.dataset.tag = tag;
      const color = demoTags.find(t=>t.id===tag).color;
      trigger.style.background = `var(--tag-${color}-bg)`;
      trigger.style.color = `var(--tag-${color}-fg)`;
      renderNotesList();demoTouchSave();persistDemoTags();
    });
  };
}
