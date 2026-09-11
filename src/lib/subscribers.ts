// Subscriber records for the Remember My Name list, stored in the vault bucket.
//
// Each person is one object at signups/<name>__<email>.json, readable from /vault.
// Two small index objects point back at it, so no request ever scans the bucket:
//   index/email/<sha256 of address>.json   used to dedupe a repeat signup
//   index/token/<token>.json               used by the confirm and unsubscribe links

type Bucket = Pick<R2Bucket, 'get' | 'put'>;

export type Status = 'unconfirmed' | 'confirmed' | 'unsubscribed';

export type Subscriber = {
  name: string;
  email: string;
  signedUpAt: string;
  source: string;
  consent: { version: string; text: string; method: string };
  // Records written before Chapter One delivery have no status and no token.
  status?: Status;
  token?: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  emailResult?: string;
  // Legacy field from the old release-date email. Dropped on the next write.
  confirmation?: string;
};

export type Found = { key: string; record: Subscriber };

// The PDF lives only in R2. The repo is public, so it must never be committed.
export const CHAPTER_KEY = 'private/chapter-one.pdf';
export const CHAPTER_FILENAME = 'Remember_My_Name_Chapter_One.pdf';

// Token URLs are bearer credentials: never cache, index, or leak them via Referer.
export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};

const TOKEN_RE = /^[0-9a-f]{64}$/;

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 256 random bits, hex encoded. */
export function newToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

/** Tokens become part of an R2 key, so anything else is rejected before lookup. */
export function isValidToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

function slugify(value: string, max: number): string {
  return value
    .toLowerCase()
    .replace(/@/g, '-at-')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max);
}

/** Name first so the vault listing reads as a list of people, not of strings. */
export function recordKey(name: string, email: string): string {
  return `signups/${slugify(name, 60)}__${slugify(email, 90)}.json`;
}

export type SubmitAction = 'create' | 'resend' | 'none';

/**
 * What a form submission does for an address we may already know.
 * Confirmed people are left alone. Everyone else, including someone who
 * unsubscribed and came back, is set to unconfirmed and emailed again.
 */
export function actionFor(existing: Subscriber | null): SubmitAction {
  if (!existing) return 'create';
  return existing.status === 'confirmed' ? 'none' : 'resend';
}

async function readJson<T>(bucket: Bucket, key: string): Promise<T | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  try {
    return JSON.parse(await obj.text()) as T;
  } catch {
    return null;
  }
}

async function readPointer(bucket: Bucket, indexKey: string): Promise<Found | null> {
  const pointer = await readJson<{ key?: unknown }>(bucket, indexKey);
  if (!pointer || typeof pointer.key !== 'string' || !pointer.key.startsWith('signups/')) {
    return null;
  }
  const record = await readJson<Subscriber>(bucket, pointer.key);
  return record ? { key: pointer.key, record } : null;
}

export async function findByEmail(bucket: Bucket, email: string, name: string): Promise<Found | null> {
  const indexed = await readPointer(bucket, `index/email/${await sha256Hex(email)}.json`);
  if (indexed) return indexed;

  // Records from before the index existed are only reachable by their own key.
  const key = recordKey(name, email);
  const legacy = await readJson<Subscriber>(bucket, key);
  return legacy && legacy.email === email ? { key, record: legacy } : null;
}

export async function findByToken(bucket: Bucket, token: string): Promise<Found | null> {
  if (!isValidToken(token)) return null;
  const found = await readPointer(bucket, `index/token/${token}.json`);
  return found && found.record.token === token ? found : null;
}

const JSON_META = { httpMetadata: { contentType: 'application/json' } };

export async function writeRecord(bucket: Bucket, key: string, record: Subscriber): Promise<void> {
  await bucket.put(key, JSON.stringify(record, null, 2), JSON_META);
}

/** Record first, so the address is durable before anything else can fail. */
export async function saveWithIndexes(bucket: Bucket, key: string, record: Subscriber): Promise<void> {
  await writeRecord(bucket, key, record);
  const pointer = JSON.stringify({ key });
  const writes = [bucket.put(`index/email/${await sha256Hex(record.email)}.json`, pointer, JSON_META)];
  if (record.token) writes.push(bucket.put(`index/token/${record.token}.json`, pointer, JSON_META));
  await Promise.all(writes);
}

/** Links carried by the email. Built from the request origin so local testing works. */
export function linksFor(origin: string, token: string) {
  return {
    confirmUrl: `${origin}/api/confirm?token=${token}`,
    unsubscribeUrl: `${origin}/api/unsubscribe?token=${token}`,
  };
}
