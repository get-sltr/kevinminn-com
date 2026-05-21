import type { APIRoute } from 'astro';
import { sanitizePath } from '../../../lib/vault/paths';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const bucket = locals.runtime.env.VAULT_BUCKET;
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
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(object.size),
    },
  });
};
