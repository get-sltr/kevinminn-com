import { readFile, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const source = await readFile(new URL('../../src/pages/vindicara.astro', import.meta.url), 'utf8');
const axiisiumLogoStats = await stat(
  new URL('../../public/assets/ventures/axiisium-logo.png', import.meta.url)
);

describe('Vindicara page', () => {
  it('describes the company and links out', () => {
    expect(source).toContain('system of record for human accountability over AI agents');
    expect(source).toContain('policy enforcement, tool scanning, agent identity');
    expect(source).toContain('https://vindicara.io/');
  });

  it('lists all three products', () => {
    expect(source).toContain("name: 'PROJECT'");
    expect(source).toContain("highlight: 'AIR'");
    expect(source).toContain("href: 'https://vindicara.io/get-started/'");
    expect(source).toContain('Every agent action, proven.');
    expect(source).toContain('class="air-red"');

    expect(source).toContain("name: 'AXIISIUM'");
    expect(source).toContain('audit-grade AI for acute myeloid leukemia');
    expect(source).toContain('https://axiisium.com');
    expect(source).toContain('Research use only. Not for diagnostic use.');
    expect(source).toContain('/assets/ventures/axiisium-logo.png');

    expect(source).toContain("name: 'AMYNEION'");
    expect(source).toContain('https://amyneion.com');
    expect(source).toContain('autoimmune trial network where patients already live');
  });

  it('shows the startup programs', () => {
    expect(source).toContain('NVIDIA Inception');
    expect(source).toContain('E2B for Startups');
    expect(source).toContain('Claude for Startups');
    expect(source).toContain('AWS for Startups');
  });

  it('never mentions J&J', () => {
    expect(source).not.toMatch(/johnson|janssen|J&J/i);
  });

  it('uses the approved AXIISIUM logo asset', () => {
    expect(axiisiumLogoStats.isFile()).toBe(true);
    expect(axiisiumLogoStats.size).toBeGreaterThan(1000);
  });
});
