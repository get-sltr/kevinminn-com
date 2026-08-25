import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const source = await readFile(new URL('../../src/components/Footer.astro', import.meta.url), 'utf8');

describe('Footer social links', () => {
  it('points LinkedIn at the right Kevin Minn', () => {
    // linkedin.com/in/kevinminn is a different person entirely.
    expect(source).toContain('https://www.linkedin.com/in/kevin-minn');
    expect(source).not.toContain('linkedin.com/in/kevinminn');
  });

  it('has no dead or placeholder links', () => {
    expect(source).not.toMatch(/href: '#'/);
    // github.com/kevinminn 404s; do not reinstate without a real handle.
    expect(source).not.toContain('github.com/kevinminn');
  });

  it('uses the live mailbox', () => {
    expect(source).toContain('mailto:info@kevinminn.com');
    expect(source).not.toContain('hello@kevinminn.com');
  });
});
