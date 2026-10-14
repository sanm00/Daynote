let timer: number | null = null;

/** Lightweight toast matching the demo's body-level `.toast` element. */
export function toast(msg: string) {
  let el = document.querySelector<HTMLDivElement>('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => el?.classList.remove('show'), 1800);
}
