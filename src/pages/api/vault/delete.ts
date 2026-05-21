import type { APIRoute } from 'astro';
import { sanitizePath } from '../../../lib/vault/paths';

export const prerender = false;

export const DELETE: APIRoute = async ({ url, locals }) => {
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

  await bucket.delete(key);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
