import { readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { ROUTES, buildSitemap } from '../../src/pages/sitemap.xml';

const pagesDir = new URL('../../src/pages/', import.meta.url);
const xml = buildSitemap(new URL('https://kevinminn.com'));

// index.astro is '/', everything else is '/<name>/'. Trailing slashes matter:
// the build emits <page>/index.html and Base.astro's canonical carries one.
const routeFor = (file: string) => (file === 'index.astro' ? '/' : `/${file.slice(0, -6)}/`);

const publicPages = (await readdir(pagesDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.astro'))
  .map((entry) => routeFor(entry.name));

describe('sitemap', () => {
  it('lists every public page', () => {
    // Adding a page under src/pages without adding it to ROUTES fails here,
    // which is the only thing stopping the sitemap from going stale.
    expect(publicPages.length).toBeGreaterThan(0);
    for (const route of publicPages) {
      expect(ROUTES).toContain(route);
    }
  });

  it('keeps the vault and the API out of it', () => {
    expect(xml).not.toContain('/vault');
    expect(xml).not.toContain('/api/');
  });

  it('emits absolute canonical URLs with their trailing slash', () => {
    expect(xml).toContain('<loc>https://kevinminn.com/</loc>');
    expect(xml).toContain('<loc>https://kevinminn.com/writing/</loc>');
    expect(xml).toContain('<loc>https://kevinminn.com/notify/</loc>');
    expect(xml).not.toMatch(/<loc>[^<]*\/(writing|contact|notify|vindicara)<\/loc>/);
  });

  it('is a valid urlset with one entry per route', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.match(/<url>/g)).toHaveLength(ROUTES.length);
  });
});
