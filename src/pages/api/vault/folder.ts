import type { APIRoute } from 'astro';
import { sanitizePath, isValidFilename } from '../../../lib/vault/paths';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const bucket = locals.runtime.env.VAULT_BUCKET;
  const body = await request.json();
  const parent = (body.parent as string) || '';
  const name = body.name as string;

  if (!name || !isValidFilename(name)) {
    return new Response(JSON.stringify({ error: 'Invalid folder name' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const folderKey = parent ? `${parent}${name}/.folder` : `${name}/.folder`;
  const safePath = sanitizePath(folderKey);
  if (!safePath) {
    return new Response(JSON.stringify({ error: 'Invalid path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await bucket.put(safePath, new ArrayBuffer(0));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  const bucket = locals.runtime.env.VAULT_BUCKET;
  const prefix = url.searchParams.get('prefix');

  if (!prefix) {
    return new Response(JSON.stringify({ error: 'Missing prefix' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const listed = await bucket.list({ prefix });
  const nonMarkerObjects = listed.objects.filter(
    (obj: R2Object) => !obj.key.endsWith('/.folder')
  );

  if (nonMarkerObjects.length > 0) {
    return new Response(JSON.stringify({ error: 'Folder is not empty' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  for (const obj of listed.objects) {
    await bucket.delete(obj.key);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
