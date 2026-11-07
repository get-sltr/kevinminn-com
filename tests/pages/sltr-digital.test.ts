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

  it('lists Caelia with its logo and a link to caelia.io', async () => {
    expect(source).toContain("name: 'Caelia'");
    expect(source).toContain("href: 'https://caelia.io'");
    expect(source).toContain("tagline: 'Video ads that sell, starring AI actors.'");
    expect(source).toContain('/assets/ventures/caelia-logo.jpg');
    await expect(
      stat(new URL('../../public/assets/ventures/caelia-logo.jpg', import.meta.url))
    ).resolves.toBeTruthy();
  });

  it('lists Motium with its logo and a link to motium.io', async () => {
    expect(source).toContain("name: 'Motium'");
    expect(source).toContain("href: 'https://motium.io'");
    expect(source).toContain('A person on your team makes every decision.');
    await expect(
      stat(new URL('../../public/assets/ventures/motium-logo.jpg', import.meta.url))
    ).resolves.toBeTruthy();
  });

  it('renders logos edge to edge rather than boxed inside a panel', () => {
    expect(source).toContain('object-fit: cover;');
  });

  it('keeps the retired products off the page', () => {
    expect(source).not.toMatch(/MemoryAisle/i);
    expect(source).not.toMatch(/johnson|janssen|J&J/i);
  });

  it('lists Nourished by Mira first, linking to the App Store', async () => {
    expect(source).toContain("name: 'Nourished by Mira'");
    expect(source).toContain("href: 'https://apps.apple.com/us/app/id6761938171'");
    await expect(
      stat(new URL('../../public/assets/ventures/nourished-logo.png', import.meta.url))
    ).resolves.toBeTruthy();
    const order = ['Nourished by Mira', 'Motium', 'Caelia', 'DriftLab HQ'].map((name) =>
      source.indexOf(`name: '${name}'`)
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('spreads the four products across the page width', () => {
    expect(source).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
  });
});
