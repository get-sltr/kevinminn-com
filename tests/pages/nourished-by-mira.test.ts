import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const source = await readFile(
  new URL('../../src/pages/nourished-by-mira.astro', import.meta.url),
  'utf8',
);
const navSource = await readFile(
  new URL('../../src/components/Nav.astro', import.meta.url),
  'utf8',
);

describe('Nourished by Mira page', () => {
  it('presents the company as Nourished by Mira Inc.', () => {
    expect(source).toContain('Nourished by Mira Inc.');
    expect(source).toContain('<div class="eyebrow">Company</div>');
    expect(source).toContain('https://nourishedbymira.com');
  });

  it('keeps the plain product name on the product itself', () => {
    // The company carries the Inc.; the app does not. A heading reading
    // "Nourished by Mira Inc." next to the App Store link would be wrong.
    expect(source).toContain("name: 'Nourished by Mira',");
    expect(source).toContain('https://apps.apple.com/us/app/id6761938171');
    expect(source).toContain('/assets/ventures/nourished-logo.png');
  });

  it('carries the product copy the studio page used, unchanged', () => {
    expect(source).toContain(
      'An iOS nutrition coach for losing fat while keeping muscle. Protein-first meal plans, body composition tracking, and portions that adapt around GLP-1 medication cycles.',
    );
  });

  it('is reachable from the nav as its own destination', () => {
    expect(navSource).toContain("href: '/nourished-by-mira'");
    expect(navSource).toContain("key: 'nourished'");
    expect(source).toContain('activePage="nourished"');
  });
});
