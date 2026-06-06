/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { sanitiseHtml } from './dom';

describe('sanitiseHtml', () => {
  it('strips javascript from href', () => {
    const html = `<a href="javascript:alert('xss')">click me</a>`;
    const result = sanitiseHtml(html);
    expect(result).not.toContain('javascript:alert');
  });

  it('strips style from p', () => {
    const html = `<p style="background:url(javascript:alert(1))">text</p>`;
    const result = sanitiseHtml(html);
    expect(result).not.toContain('style=');
  });

  it('keeps style on code', () => {
    const html = `<code style="color:red">code</code>`;
    const result = sanitiseHtml(html);
    expect(result).toContain('style="color:red"');
  });
});
