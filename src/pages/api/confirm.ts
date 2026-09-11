import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  CHAPTER_FILENAME,
  CHAPTER_KEY,
  PRIVATE_HEADERS,
  findByToken,
  writeRecord,
} from '../../lib/subscribers';

export const prerender = false;

// The Read Chapter One link. Confirms the address and hands over the PDF.
// It keeps working on every later click, since the token never changes.

function text(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...PRIVATE_HEADERS },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const bucket = (env as unknown as ENV).VAULT_BUCKET;

  const found = await findByToken(bucket, url.searchParams.get('token') ?? '');
  if (!found) {
    return text('This link is not valid.', 404);
  }

  const pdf = await bucket.get(CHAPTER_KEY);
  if (!pdf) {
    console.error('[confirm] chapter missing from R2 at', CHAPTER_KEY);
    return text('Chapter One is not available right now. Please try again later.', 503);
  }

  // Only the first click confirms. Someone who has unsubscribed can still read
  // the chapter, but clicking an old link must never quietly sign them back up.
  const { record } = found;
  if (record.status !== 'confirmed' && record.status !== 'unsubscribed') {
    try {
      const confirmedAt = new Date().toISOString();
      await writeRecord(bucket, found.key, { ...record, status: 'confirmed', confirmedAt });
    } catch (err) {
      console.error('[confirm] could not mark confirmed', String(err));
    }
  }

  return new Response(pdf.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${CHAPTER_FILENAME}"`,
      'Content-Length': String(pdf.size),
      ...PRIVATE_HEADERS,
    },
  });
};
