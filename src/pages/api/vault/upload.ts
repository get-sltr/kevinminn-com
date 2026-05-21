import type { APIRoute } from 'astro';
import { sanitizePath } from '../../../lib/vault/paths';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const bucket = locals.runtime.env.VAULT_BUCKET;
  const form = await request.formData();
  const file = form.get('file') as File | null;
  const folder = (form.get('folder') as string) || '';

  if (!file || !file.name) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = folder ? `${folder}${file.name}` : file.name;
  const safePath = sanitizePath(key);
  if (!safePath) {
    return new Response(JSON.stringify({ error: 'Invalid file path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await bucket.put(safePath, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  return new Response(JSON.stringify({ ok: true, key: safePath }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
