import type { APIRoute } from 'astro';

// Hand-rolled rather than @astrojs/sitemap, which would be a new dependency for
// six URLs. robots.txt has pointed at this path since launch and it 404ed, so
// every crawler that asked for it got nothing.
//
// The vault and the API are deliberately left out. They are noindex in
// public/_headers and Disallowed in robots.txt, and listing them here would undo
// the only thing keeping that URL undiscovered.

// Trailing slashes on purpose: the build emits <page>/index.html, so these have
// to match the canonical Base.astro renders, or crawlers see two URLs per page.
// tests/pages/sitemap.test.ts fails if a new public page is not listed here.
export const ROUTES = ['/', '/writing/', '/sltr-digital/', '/vindicara/', '/nourished-by-mira/', '/contact/', '/notify/'];

// Pure, like the builders in src/lib/email.ts, so the output can be asserted on
// without standing up a request.
export function buildSitemap(site: URL): string {
  const urls = ROUTES.map((route) => `  <url><loc>${new URL(route, site).href}</loc></url>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error('astro.config.mjs must set `site` before the sitemap can build absolute URLs');
  }

  return new Response(buildSitemap(site), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
