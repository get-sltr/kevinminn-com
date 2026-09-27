import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { sanitizePath } from '../../../lib/vault/paths';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const bucket = (env as unknown as ENV).VAULT_BUCKET;
  const rawKey = url.searchParams.get('key');

  if (!rawKey) {
    return new Response(JSON.stringify({ error: 'Missing key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = sanitizePath(rawKey);
  if (!key) {
    return new Response(JSON.stringify({ error: 'Invalid key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const object = await bucket.get(key);
  if (!object) {
    return new Response(JSON.stringify({ error: 'File not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filename = key.split('/').pop() || 'download';

  // ?inline=1 lets the vault viewer frame a PDF. It is honoured for PDFs only, so an
  // uploaded HTML or SVG file can never render as a page on this origin.
  const isPdf =
    object.httpMetadata?.contentType === 'application/pdf' || /\.pdf$/i.test(filename);
  const inline = url.searchParams.get('inline') === '1' && isPdf;
  const contentType = isPdf
    ? 'application/pdf'
    : object.httpMetadata?.contentType || 'application/octet-stream';

  // Header values must be Latin-1, and macOS screenshot names carry U+202F, so the
  // real name goes in filename* (RFC 6266) with a plain ASCII fallback beside it.
  const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, '_');
  return new Response(object.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(object.size),
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
