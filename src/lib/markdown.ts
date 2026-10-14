export function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface EditResult {
  text: string;
  start: number;
  end: number;
}

/** Toggle an inline marker (`` ` `` / `**`) around a selection. */
export function insertPair(value: string, selStart: number, selEnd: number, token: string): EditResult {
  const n = token.length;
  const selected = value.slice(selStart, selEnd);
  if (
    selected &&
    value.slice(selStart - n, selStart) === token &&
    value.slice(selEnd, selEnd + n) === token
  ) {
    return {
      text: value.slice(0, selStart - n) + selected + value.slice(selEnd + n),
      start: selStart - n,
      end: selEnd - n,
    };
  }
  if (selected.startsWith(token) && selected.endsWith(token) && selected.length >= n * 2) {
    const inner = selected.slice(n, selected.length - n);
    return {
      text: value.slice(0, selStart) + inner + value.slice(selEnd),
      start: selStart,
      end: selStart + inner.length,
    };
  }
  return {
    text: value.slice(0, selStart) + token + selected + token + value.slice(selEnd),
    start: selStart + n,
    end: selEnd + n,
  };
}

/** Toggle a ``` fence around the selection (or the current line when empty). */
export function toggleFence(value: string, selStart: number, selEnd: number, lang: string): EditResult {
  const open = '```' + lang;
  const lineRange = (pos: number): [number, number] => {
    const s = value.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
    const e = value.indexOf('\n', pos);
    return [s, e === -1 ? value.length : e];
  };
  let ls = lineRange(selStart)[0];
  let le = value.indexOf('\n', selEnd);
  if (le === -1) le = value.length;

  // A caret resting inside or on the edge of a fenced block targets the whole
  // block, so toggling removes it instead of nesting a new fence.
  if (selStart === selEnd) {
    const seen = new Set<string>();
    outer: for (const pos of [selStart, ls, le]) {
      for (const probe of pos > 0 ? [lineRange(pos - 1), lineRange(pos)] : [lineRange(pos)]) {
        const key = probe.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        const [os, oe] = probe;
        if (!value.slice(os, oe).trimStart().startsWith('```')) continue;
        const nextNl = value.indexOf('\n', oe + 1);
        const lineEnd = nextNl === -1 ? value.length : nextNl;
        let end = -1;
        for (let k = value.length; k > lineEnd; k--) {
          if (value.slice(k - 3, k) === '```') {
            end = k;
            break;
          }
        }
        if (end === -1) continue;
        ls = os;
        le = end;
        break outer;
      }
    }
  }

  const region = value.slice(ls, le);
  const lines = region.split('\n');
  const fenced =
    lines.length >= 2 &&
    lines[0].trimStart().startsWith('```') &&
    lines[lines.length - 1].trim() === '```';
  if (fenced) {
    const inner = lines.slice(1, -1).join('\n');
    return {
      text: value.slice(0, ls) + inner + value.slice(le),
      start: ls,
      end: ls + inner.length,
    };
  }
  const block = open + '\n' + region + '\n```';
  return {
    text: value.slice(0, ls) + block + value.slice(le),
    start: ls + open.length + 1,
    end: ls + open.length + 1 + region.length,
  };
}

function inlineMd(input: string): string {
  let s = String(input);
  const codes: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_m, c: string) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) => `<img src="${url}" alt="${alt}">`);
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, txt, url) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`,
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_\w])_([^_\s][^_]*?)_/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i) => `<code>${escapeHtml(codes[+i])}</code>`);
  return s;
}

type ListItem = { task: boolean; checked?: boolean; text: string };

/** Ported verbatim from the demo so rendered HTML (and its CSS) matches exactly. */
export function mdToHtml(src: string): string {
  src = (src || '').replace(/\r\n?/g, '\n');
  if (!src.trim())
    return '<div class="note-render-empty">还没有内容，点击「编辑」写点什么，支持 Markdown 语法…</div>';
  const lines = src.split('\n');
  const isList = (l: string) => /^\s*([-*+]|\d+\.)\s+/.test(l);
  const isHr = (l: string) => /^\s*([-*_])\s*(\1\s*){2,}$/.test(l);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      const lang = line.replace(/^\s*```/, '').trim();
      i++;
      const buf: string[] = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing fence when present
      out.push(
        `<pre${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}><code>${escapeHtml(buf.join('\n'))}</code></pre>`,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    if (isHr(line)) {
      out.push('<hr>');
      i++;
      continue;
    }
    const hm = line.match(/^(#{1,6})\s+(.*)$/);
    if (hm) {
      const level = Math.min(hm[1].length, 4);
      out.push(`<h${level}>${inlineMd(hm[2].trim())}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${inlineMd(buf.join(' '))}</blockquote>`);
      continue;
    }
    if (isList(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: ListItem[] = [];
      while (i < lines.length && isList(lines[i])) {
        const cur = lines[i];
        const tm = cur.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
        const lm = cur.match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
        if (tm) items.push({ task: true, checked: tm[1].toLowerCase() === 'x', text: tm[2] });
        else if (lm) items.push({ task: false, text: lm[2] });
        i++;
      }
      if (items.some((it) => it.task)) {
        out.push(
          '<div class="note-inline-tasks">' +
            items
              .map((it) => {
                if (it.task) {
                  return (
                    `<div class="note-task ${it.checked ? 'done' : ''}">` +
                    `<span class="note-check">${it.checked ? '✓' : ''}</span>` +
                    `<span class="note-task-text">${inlineMd(it.text)}</span></div>`
                  );
                }
                return (
                  `<div class="note-task"><span class="note-check" style="border:0"></span>` +
                  `<span class="note-task-text">${inlineMd(it.text)}</span></div>`
                );
              })
              .join('') +
            '</div>',
        );
      } else if (ordered) {
        out.push('<ol>' + items.map((it) => `<li>${inlineMd(it.text)}</li>`).join('') + '</ol>');
      } else {
        out.push('<ul>' + items.map((it) => `<li>${inlineMd(it.text)}</li>`).join('') + '</ul>');
      }
      continue;
    }
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !isList(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !isHr(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inlineMd(buf.join('\n')).replace(/\n/g, '<br>')}</p>`);
  }
  return out.join('\n');
}

/** Plain-text projection used for list snippets and search matching. */
export function plainText(md: string): string {
  return (md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
