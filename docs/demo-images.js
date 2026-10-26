/* Browser-only image storage shared by the two standalone demos. */
window.DaynoteDemoImages = (() => {
  const referencePattern = /^images\/[a-f0-9]{64}\.(png|jpg|gif|webp)$/;
  let disposePreview = () => {};

  function format(bytes) {
    const starts = (...signature) => signature.every((b, i) => bytes[i] === b);
    const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
    if (starts(137, 80, 78, 71, 13, 10, 26, 10)) return 'png';
    if (starts(255, 216, 255)) return 'jpg';
    if (['GIF87a', 'GIF89a'].includes(ascii(0, 6))) return 'gif';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
    throw new Error('仅支持 PNG、JPEG、GIF 和 WebP 图片');
  }

  async function access(path, blob) {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('daynote-demo-images', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('images', blob ? 'readwrite' : 'readonly');
        const store = tx.objectStore('images');
        const request = blob ? store.put(blob, path) : store.get(path);
        tx.oncomplete = () => {
          const result = blob || request.result;
          if (result) resolve(result);
          else reject(new Error('图片文件不存在'));
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('图片存储失败'));
      });
    } finally { db.close(); }
  }

  async function save(file) {
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('图片大小需在 10 MB 以内');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = format(bytes);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const path = `images/${hash}.${extension}`;
    await access(path, new Blob([bytes], { type: `image/${extension === 'jpg' ? 'jpeg' : extension}` }));
    return path;
  }

  function hydrate(container) {
    disposePreview();
    let disposed = false;
    const urls = [];
    disposePreview = () => { disposed = true; urls.forEach(url => URL.revokeObjectURL(url)); };
    container.querySelectorAll('img[data-note-image]').forEach(async img => {
      try {
        const path = img.dataset.noteImage;
        if (!referencePattern.test(path)) throw new Error('无效的图片引用');
        const blob = await access(path);
        if (disposed || !img.isConnected) return;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        img.src = url;
      } catch {
        if (!disposed) { img.alt += '（图片加载失败）'; img.title = '图片文件不存在或无法读取'; }
      }
    });
  }

  function install({ currentNote, isEditing, notify }) {
    let pending = false;
    let revision = 0;
    document.addEventListener('input', () => revision++);
    document.addEventListener('click', () => revision++);
    document.addEventListener('keydown', () => revision++);
    document.addEventListener('paste', async event => {
      const editor = event.target;
      if (editor.id !== 'noteContentInput' || !isEditing()) return;
      const files = Array.from(event.clipboardData?.items || [])
        .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
        .map(item => item.getAsFile()).filter(Boolean);
      if (!files.length) return;
      event.preventDefault();
      if (pending) { notify('图片正在保存，请稍候'); return; }
      const note = currentNote();
      const value = editor.value;
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const version = revision;
      pending = true;
      editor.setAttribute('aria-busy', 'true');
      notify('正在保存图片…');
      try {
        const references = [];
        for (const file of files) references.push(await save(file));
        if (!editor.isConnected || currentNote() !== note || !isEditing()
          || revision !== version || editor.value !== value
          || editor.selectionStart !== start || editor.selectionEnd !== end) {
          notify('编辑位置已变化，请重新粘贴图片');
          return;
        }
        const markdown = references.map(path => `![截图](${path})`).join('\n');
        editor.setRangeText(markdown, start, end, 'end');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.focus();
        notify('图片已插入，切换预览即可查看');
      } catch (error) {
        notify(`图片粘贴失败：${error.message || error}`);
      } finally {
        pending = false;
        editor.removeAttribute('aria-busy');
      }
    });
  }

  return { referencePattern, save, hydrate, install };
})();
