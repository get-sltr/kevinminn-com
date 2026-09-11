// Chapter One as email body text, stored in R2 next to the PDF.
// The repo is public, so the manuscript never lives in code. The signup endpoint
// loads it per send; if it is missing or malformed the email falls back to a link.

type Bucket = Pick<R2Bucket, 'get'>;

export const CHAPTER_TEXT_KEY = 'private/chapter-one.json';

export type Chapter = { label: string; title: string; paragraphs: string[] };

export function parseChapter(raw: string): Chapter | null {
  try {
    const value = JSON.parse(raw) as Partial<Chapter>;
    const ok =
      typeof value.label === 'string' &&
      typeof value.title === 'string' &&
      Array.isArray(value.paragraphs) &&
      value.paragraphs.length > 0 &&
      value.paragraphs.every((p) => typeof p === 'string');
    return ok ? (value as Chapter) : null;
  } catch {
    return null;
  }
}

export async function loadChapter(bucket: Bucket): Promise<Chapter | null> {
  try {
    const obj = await bucket.get(CHAPTER_TEXT_KEY);
    return obj ? parseChapter(await obj.text()) : null;
  } catch (err) {
    console.error('[chapter] could not load chapter text', String(err));
    return null;
  }
}
