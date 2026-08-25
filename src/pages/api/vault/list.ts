import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { parseFolderPrefix } from '../../../lib/vault/paths';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const bucket = (env as unknown as ENV).VAULT_BUCKET;
  const prefix = parseFolderPrefix(url.searchParams.get('prefix') || '');

  const listed = await bucket.list({
    prefix: prefix || undefined,
    delimiter: '/',
  });

  const folders = (listed.delimitedPrefixes || []).map((p: string) => {
    const name = p.slice(prefix.length).replace(/\/$/, '');
    return { name, prefix: p };
  });

  const files = listed.objects
    .filter((obj: R2Object) => !obj.key.endsWith('/.folder'))
    .map((obj: R2Object) => ({
      key: obj.key,
      name: obj.key.slice(prefix.length),
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      contentType: obj.httpMetadata?.contentType || 'application/octet-stream',
    }));

  return new Response(JSON.stringify({ folders, files, prefix }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
