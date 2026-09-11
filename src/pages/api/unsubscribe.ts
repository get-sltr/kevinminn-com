import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { PRIVATE_HEADERS, findByToken, writeRecord } from '../../lib/subscribers';

export const prerender = false;

// One click from the email footer. No login, no form.

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Unsubscribed</title>
</head>
<body style="margin:0;padding:80px 22px;background:#fbf8f3;color:#1c1a17;font-family:Georgia,'Times New Roman',serif;font-size:19px;text-align:center;">
<p>You have been unsubscribed from emails about Remember My Name.</p>
</body>
</html>`;

export const GET: APIRoute = async ({ url }) => {
  const bucket = (env as unknown as ENV).VAULT_BUCKET;

  const found = await findByToken(bucket, url.searchParams.get('token') ?? '');
  if (!found) {
    return new Response('This link is not valid.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...PRIVATE_HEADERS },
    });
  }

  // Already unsubscribed keeps the original timestamp.
  if (found.record.status !== 'unsubscribed') {
    const unsubscribedAt = new Date().toISOString();
    await writeRecord(bucket, found.key, { ...found.record, status: 'unsubscribed', unsubscribedAt });
  }

  return new Response(PAGE, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...PRIVATE_HEADERS },
  });
};
