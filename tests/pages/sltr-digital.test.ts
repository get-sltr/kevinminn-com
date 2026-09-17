import { readFile, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const source = await readFile(new URL('../../src/pages/sltr-digital.astro', import.meta.url), 'utf8');

describe('SLTR Digital Studio page', () => {
  it('lists the studio products', () => {
    expect(source).toContain('SLTR Digital Studio');
    expect(source).toContain('DriftLab HQ');
    expect(source).toContain("triad: ['Inspired', 'Intelligent', 'Interactive']");
    expect(source).toContain('/assets/ventures/driftlabhq-logo.jpg');
    expect(source).toContain('driftlab-signup');
    expect(source).toContain('Join beta');
    expect(source).toContain('https://sltrdigitalstudio.com');
  });

  it('renders logos edge to edge rather than boxed inside a panel', () => {
    expect(source).toContain('object-fit: cover;');
  });

  it('keeps the retired products off the page', () => {
    expect(source).not.toMatch(/MemoryAisle/i);
    expect(source).not.toMatch(/johnson|janssen|J&J/i);
  });

  it('no longer carries Nourished by Mira, which stands on its own page', () => {
    // Only the pointer comment may mention it. The card, the logo and the App
    // Store link all live in nourished-by-mira.astro now.
    expect(source).not.toContain('/assets/ventures/nourished-logo.png');
    expect(source).not.toContain('https://apps.apple.com/us/app/id6761938171');
    expect(source).toContain('nourished-by-mira.astro');
  });
});
