import { describe, expect, it } from 'vitest';
import { insertPair, mdToHtml, toggleFence } from './markdown';

describe('mdToHtml fenced code', () => {
  it('renders a closed fence as one <pre> with the language badge', () => {
    const html = mdToHtml('```js\nconst a = 1;\n```\n');
    expect(html).toContain('<pre data-lang="js"><code>const a = 1;</code></pre>');
    expect(html.match(/<pre/g)).toHaveLength(1);
  });

  it('keeps blank lines inside an unterminated fence instead of splitting blocks', () => {
    const html = mdToHtml('```ts\ninterface A {\n\n}\n');
    expect(html.match(/<pre/g)).toHaveLength(1);
    expect(html).toContain('<pre data-lang="ts">');
    expect(html).toContain('interface A {\n\n}');
  });

  it('escapes markup inside fences verbatim', () => {
    expect(mdToHtml('```\n<b>x</b> & y\n```')).toContain('&lt;b&gt;x&lt;/b&gt; &amp; y');
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
