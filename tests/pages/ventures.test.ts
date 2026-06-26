import { readFile, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const venturesSource = await readFile(new URL('../../src/pages/ventures.astro', import.meta.url), 'utf8');
const axiisiumLogoStats = await stat(
  new URL('../../public/assets/ventures/axiisium-logo.png', import.meta.url)
);

describe('Ventures page', () => {
  it('presents the current ventures without the old placeholder scale copy', () => {
    expect(venturesSource).toContain('SLTR Digital Studio');
    expect(venturesSource).toContain('Primal');
    expect(venturesSource).toContain('MemoryAisle');
    expect(venturesSource).toContain('https://apps.apple.com/us/app/memoryaisle-glp-1-nutrition/id6761938171');
    expect(venturesSource).toContain('DriftLab HQ');
    expect(venturesSource).toContain('A calm operating space for ideas, notes, projects, and systems');
    expect(venturesSource).toContain('driftlab-signup');
    expect(venturesSource).toContain('Join beta');
    expect(venturesSource).toContain('Vindicara');
    expect(venturesSource).toContain('https://vindicara.io/');
    expect(venturesSource).toContain("name: 'PROJECT'");
    expect(venturesSource).toContain("highlight: 'AIR'");
    expect(venturesSource).toContain("href: 'https://vindicara.io/get-started/'");
    expect(venturesSource).toContain('class="air-red"');
    expect(venturesSource).toContain("name: 'AXIISIUM'");
    expect(venturesSource).toContain('/assets/ventures/axiisium-logo.png');
    expect(venturesSource).toContain('AXIISIUM healthcare AI logo');
    expect(venturesSource).toContain('fineNote');
    expect(venturesSource).toContain('Axiisium is early and in active development.');
    expect(venturesSource).toContain('system of record for human accountability over AI agents');
    expect(venturesSource).toContain('policy enforcement, tool scanning, agent identity');
    expect(venturesSource).toContain('Every agent action, proven.');
    expect(venturesSource).toContain('human accountability over AI agents');
    expect(venturesSource).toContain('Axiisium');
    expect(venturesSource).toContain('Read the whole patient. Prove every call.');
    expect(venturesSource).toContain('multimodal AI for acute myeloid leukemia');
    expect(venturesSource).toContain('trial enrichment');

    expect(venturesSource).toContain('/assets/ventures/primal-logo.png');
    expect(venturesSource).toContain('/assets/ventures/memoryaisle-logo.png');
    expect(venturesSource).toContain('/assets/ventures/driftlab-logo.png');
    expect(venturesSource).toContain('/assets/ventures/project-air-logo.png');
    expect(venturesSource).toContain('/assets/ventures/axiisium-logo.png');
    expect(venturesSource).toContain('width: 52%;');
    expect(venturesSource).toContain('width: 28%;');
    expect(venturesSource).toContain('background: transparent;');
    expect(venturesSource).toContain('min-height: 100vh;');

    expect(venturesSource).not.toMatch(/Six products/i);
    expect(venturesSource).not.toMatch(/two Delaware C-Corps/i);
    expect(venturesSource).not.toMatch(/Details will be shaped here/i);
    expect(venturesSource).not.toMatch(/intelligent risk detection/i);
    expect(venturesSource).not.toMatch(/Logs are claims/i);
    expect(venturesSource).not.toMatch(/Notion/i);
    expect(venturesSource).not.toContain("name: 'Project'");
    expect(venturesSource).not.toContain("name: 'Axiisium'");
  });

  it('uses the approved AXIISIUM logo image asset', () => {
    expect(axiisiumLogoStats.isFile()).toBe(true);
    expect(axiisiumLogoStats.size).toBeGreaterThan(1000);
  });
});
