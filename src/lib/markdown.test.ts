import { describe, expect, it } from 'vitest';
import { insertPair, mdToHtml, toggleFence } from './markdown';

describe('mdToHtml fenced code', () => {
  it('renders a closed fence as one <pre> with the language badge and highlight spans', () => {
    const html = mdToHtml('```js\nconst a = 1;\n```\n');
    expect(html).toContain('<pre data-lang="js"><code class="hljs">');
    expect(html).toContain('hljs-keyword');
    expect(html).toContain('hljs-number');
    expect(html.match(/<pre/g)).toHaveLength(1);
  });

  it('keeps blank lines inside an unterminated fence instead of splitting blocks', () => {
    const html = mdToHtml('```ts\ninterface A {\n\n}\n');
    expect(html.match(/<pre/g)).toHaveLength(1);
    expect(html).toContain('<pre data-lang="ts">');
    expect(html).toContain('interface');
  });

  it('escapes markup inside fences verbatim', () => {
    expect(mdToHtml('```\n<b>x</b> & y\n```')).toContain('&lt;b&gt;x&lt;/b&gt; &amp; y');
  });

  it('escapes when the language is unknown', () => {
    const html = mdToHtml('```nope\n<b>x</b>\n```');
    expect(html).toContain('<code>&lt;b&gt;x&lt;/b&gt;</code>');
    expect(html).not.toContain('class="hljs"');
  });
});

describe('mdToHtml tables', () => {
  const table = ['| 项 | 决策 |', '|---|---|', '| 范围 | 后端 |', '| 层级 | 5 层 |'].join('\n');

  it('renders a header and body table', () => {
    const html = mdToHtml(table);
    expect(html).toContain('<table><thead><tr><th>项</th><th>决策</th></tr></thead><tbody>');
    expect(html).toContain('<tr><td>范围</td><td>后端</td></tr>');
    expect(html).toContain('<tr><td>层级</td><td>5 层</td></tr>');
  });

  it('supports alignment markers', () => {
    const html = mdToHtml(['| a | b | c |', '|:--|:-:|--:|', '| 1 | 2 | 3 |'].join('\n'));
    expect(html).toContain('<th style="text-align:left">a</th>');
    expect(html).toContain('<th style="text-align:center">b</th>');
    expect(html).toContain('<th style="text-align:right">c</th>');
  });

  it('applies inline markdown inside cells', () => {
    const html = mdToHtml(['| a |', '|--|', '| `code` **b** |'].join('\n'));
    expect(html).toContain('<td><code>code</code> <strong>b</strong></td>');
  });

  it('keeps literal pipes escaped in cells', () => {
    const html = mdToHtml(['| a |', '|--|', '| x \\| y |'].join('\n'));
    expect(html).toContain('<td>x | y</td>');
  });

  it('does not treat a lone pipe line as a table', () => {
    expect(mdToHtml('a | b')).toContain('<p>a | b</p>');
  });
});

describe('insertPair', () => {
  const val = 'abc def';

  it('wraps the selection', () => {
    const r = insertPair(val, 0, 3, '**');
    expect(r.text).toBe('**abc** def');
    expect(r.start).toBe(2);
    expect(r.end).toBe(5);
  });

  it('unwraps when the selection is already wrapped', () => {
    const r = insertPair('**abc** def', 2, 5, '**');
    expect(r.text).toBe('abc def');
    expect(r.start).toBe(0);
    expect(r.end).toBe(3);
  });

  it('places the caret between the markers for an empty selection', () => {
    const r = insertPair('ab', 2, 2, '`');
    expect(r.text).toBe('ab``');
    expect(r.start).toBe(3);
    expect(r.end).toBe(3);
  });

  it('wraps the selection when only one side is wrapped', () => {
    const r = insertPair('`ab', 1, 3, '`');
    expect(r.text).toBe('``ab`');
    expect(r.start).toBe(2);
    expect(r.end).toBe(4);
  });
});

describe('toggleFence', () => {
  it('fences a multi-line selection and re-aligns the caret', () => {
    const text = 'let x = 1;\nlet y = 2;';
    const r = toggleFence(text, 0, text.length, 'ts');
    expect(r.text).toBe('```ts\nlet x = 1;\nlet y = 2;\n```');
    expect(r.start).toBe(6);
    expect(r.end).toBe(text.length + 6);
  });

  it('unfences a region that is fully wrapped', () => {
    const text = '```ts\nlet x = 1;\n```';
    const r = toggleFence(text, 0, text.length, 'ts');
    expect(r.text).toBe('let x = 1;');
    expect(r.start).toBe(0);
    expect(r.end).toBe(10);
  });

  it('fences the current line when nothing is selected', () => {
    const text = 'head\ncode here\ntail';
    const r = toggleFence(text, 7, 7, '');
    expect(r.text).toBe('head\n```\ncode here\n```\ntail');
  });

  it('toggles the enclosing block off when the caret sits on a fence', () => {
    const text = '```\ncode\n```';
    const r = toggleFence(text, 4, 4, '');
    expect(r.text).toBe('code');
    expect(r.start).toBe(0);
    expect(r.end).toBe(4);
  });
});
