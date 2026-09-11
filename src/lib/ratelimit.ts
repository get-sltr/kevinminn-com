// Basic per-IP rate limit for the public signup form, stored in the vault bucket.
//
// Cloudflare's built-in limiter only counts over 10 or 60 second windows, so an
// hourly limit is a fixed-window counter in R2 instead. One object per IP per hour:
//   ratelimit/<YYYY-MM-DDTHH>/<hmac of ip>
// The hour is in the key, so a new hour starts a fresh counter and old objects are
// simply never read again. No cleanup job, by choice.
//
// Read then write is not atomic. A burst of concurrent requests can slip a few past
// the limit, which is acceptable for a signup form.

type Bucket = Pick<R2Bucket, 'get' | 'put'>;

export const LIMIT_PER_HOUR = 10;

export function hourStamp(now: Date): string {
  return now.toISOString().slice(0, 13);
}

/**
 * IPs are never stored raw. A plain SHA-256 of an IPv4 address is reversible by
 * brute force, so it is keyed with the vault secret when one is available.
 */
export async function hashIp(ip: string, secret?: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  let digest: ArrayBuffer;
  if (secret) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    digest = await crypto.subtle.sign('HMAC', key, data);
  } else {
    digest = await crypto.subtle.digest('SHA-256', data);
  }
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Counts this submission and reports whether the IP is over the hourly limit. */
export async function isRateLimited(
  bucket: Bucket,
  ip: string,
  secret?: string,
  now: Date = new Date()
): Promise<boolean> {
  const key = `ratelimit/${hourStamp(now)}/${await hashIp(ip, secret)}`;
  const existing = await bucket.get(key);
  const count = existing ? Number.parseInt(await existing.text(), 10) || 0 : 0;
  if (count >= LIMIT_PER_HOUR) return true;
  await bucket.put(key, String(count + 1));
  return false;
}
