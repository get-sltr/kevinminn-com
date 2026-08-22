import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const baseSource = await readFile(new URL('../../src/layouts/Base.astro', import.meta.url), 'utf8');

describe('Base layout interstitial', () => {
  it('persists the quote interstitial after a visitor sees it once', () => {
    expect(baseSource).toContain("const SEEN_KEY = 'kevinminn-interstitial-seen'");
    expect(baseSource).toContain('window.localStorage.getItem(SEEN_KEY)');
    expect(baseSource).toContain('window.localStorage.setItem(SEEN_KEY,');
    expect(baseSource).toContain('markInterstitialSeen();');
    expect(baseSource).not.toContain('sessionStorage');
  });

  it('avoids intercepting current-page and modified navigation clicks', () => {
    expect(baseSource).toContain('normalizePath(targetUrl.pathname)');
    expect(baseSource).toContain('normalizePath(window.location.pathname)');
    expect(baseSource).toContain('e.metaKey');
    expect(baseSource).toContain("link.target && link.target !== '_self'");
  });
});
