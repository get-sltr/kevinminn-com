import { describe, expect, it } from 'vitest';
import { LIMIT_PER_HOUR, hashIp, hourStamp, isRateLimited } from '../../src/lib/ratelimit';
import { fakeBucket } from './fake-bucket';

describe('rate limit', () => {
  const now = new Date('2026-09-10T19:42:00Z');

  it('allows ten submissions per IP per hour, then blocks', async () => {
    const { bucket } = fakeBucket();
    for (let i = 0; i < LIMIT_PER_HOUR; i++) {
      expect(await isRateLimited(bucket, '203.0.113.7', 'secret', now)).toBe(false);
    }
    expect(await isRateLimited(bucket, '203.0.113.7', 'secret', now)).toBe(true);
    expect(LIMIT_PER_HOUR).toBe(10);
  });

  it('counts each IP separately', async () => {
    const { bucket } = fakeBucket();
    for (let i = 0; i < LIMIT_PER_HOUR; i++) await isRateLimited(bucket, '203.0.113.7', 's', now);
    expect(await isRateLimited(bucket, '198.51.100.1', 's', now)).toBe(false);
  });

  it('starts a fresh counter when the hour changes', async () => {
    const { bucket } = fakeBucket();
    for (let i = 0; i < LIMIT_PER_HOUR; i++) await isRateLimited(bucket, '203.0.113.7', 's', now);
    const nextHour = new Date('2026-09-10T20:00:00Z');
    expect(await isRateLimited(bucket, '203.0.113.7', 's', nextHour)).toBe(false);
  });

  it('keys on the hour and a hash, never the raw IP', async () => {
    const { bucket, store } = fakeBucket();
    await isRateLimited(bucket, '203.0.113.7', 's', now);
    const [key] = [...store.keys()];
    expect(hourStamp(now)).toBe('2026-09-10T19');
    expect(key).toMatch(/^ratelimit\/2026-09-10T19\/[0-9a-f]{64}$/);
    expect(key).not.toContain('203.0.113.7');
  });

  it('keys the hash with the secret, so it cannot be brute forced without it', async () => {
    expect(await hashIp('203.0.113.7', 'a')).not.toBe(await hashIp('203.0.113.7', 'b'));
    expect(await hashIp('203.0.113.7')).toMatch(/^[0-9a-f]{64}$/);
  });
});
