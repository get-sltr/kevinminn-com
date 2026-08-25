import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const source = await readFile(new URL('../../src/pages/writing.astro', import.meta.url), 'utf8');

describe('Writing page cover lightbox', () => {
  it('makes both covers open a zoomable view', () => {
    expect(source).toContain('class="cover-btn"');
    expect(source).toContain('data-cover="/assets/bookcover6.png"');
    expect(source).toContain('data-cover="/assets/backcover2.png"');
    // Buttons, not bare images, so the covers are keyboard reachable.
    expect(source).toMatch(/<button[^>]*class="cover-btn"/);
  });

  it('uses a native dialog so Escape and focus trapping come for free', () => {
    expect(source).toContain('<dialog class="lightbox"');
    expect(source).toContain('showModal()');
    expect(source).toContain('lightbox.close()');
  });

  it('zooms to native width so the back cover text is legible', () => {
    expect(source).toContain('width: 992px;');
    expect(source).toContain('overflow: auto;');
  });

  it('keeps the release copy intact', () => {
    expect(source).toContain('Releasing this fall.');
    expect(source).toContain('He learned to survive by making himself smaller.');
  });
});
