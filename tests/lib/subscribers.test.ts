import { describe, expect, it } from 'vitest';
import {
  actionFor,
  findByEmail,
  findByToken,
  isValidToken,
  linksFor,
  newToken,
  recordKey,
  saveWithIndexes,
  type Subscriber,
} from '../../src/lib/subscribers';
import { fakeBucket } from './fake-bucket';

function subscriber(overrides: Partial<Subscriber> = {}): Subscriber {
  return {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    signedUpAt: '2026-09-10T00:00:00.000Z',
    source: 'remember-my-name',
    consent: { version: 'v', text: 't', method: 'm' },
    status: 'unconfirmed',
    token: newToken(),
    ...overrides,
  };
}

describe('tokens', () => {
  it('are 64 hex characters and unique', () => {
    const a = newToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(isValidToken(a)).toBe(true);
    expect(newToken()).not.toBe(a);
  });

  it('reject anything that could steer an R2 key', () => {
    for (const bad of ['', '../signups/x', 'A'.repeat(64), `${'a'.repeat(63)}/`, 'a'.repeat(65), null]) {
      expect(isValidToken(bad)).toBe(false);
    }
  });
});

describe('actionFor', () => {
  it('creates a new record for an unknown address', () => {
    expect(actionFor(null)).toBe('create');
  });

  it('resends to unconfirmed, unsubscribed, and pre-existing records', () => {
    expect(actionFor(subscriber({ status: 'unconfirmed' }))).toBe('resend');
    expect(actionFor(subscriber({ status: 'unsubscribed' }))).toBe('resend');
    expect(actionFor(subscriber({ status: undefined, token: undefined }))).toBe('resend');
  });

  it('does nothing for a confirmed subscriber', () => {
    expect(actionFor(subscriber({ status: 'confirmed' }))).toBe('none');
  });
});

describe('lookups', () => {
  it('finds a saved subscriber by email even when the name differs', async () => {
    const { bucket } = fakeBucket();
    const record = subscriber();
    const key = recordKey(record.name, record.email);
    await saveWithIndexes(bucket, key, record);

    const found = await findByEmail(bucket, 'ada@example.com', 'Someone Else');
    expect(found?.key).toBe(key);
    expect(found?.record.token).toBe(record.token);
  });

  it('finds a record from before the index existed by its own key', async () => {
    const { bucket, store } = fakeBucket();
    const legacy = subscriber({ status: undefined, token: undefined });
    const key = recordKey(legacy.name, legacy.email);
    store.set(key, JSON.stringify(legacy));

    expect((await findByEmail(bucket, legacy.email, legacy.name))?.key).toBe(key);
    expect(await findByEmail(bucket, 'other@example.com', legacy.name)).toBeNull();
  });

  it('finds a subscriber by token and rejects unknown or malformed tokens', async () => {
    const { bucket } = fakeBucket();
    const record = subscriber();
    await saveWithIndexes(bucket, recordKey(record.name, record.email), record);

    expect((await findByToken(bucket, record.token as string))?.record.email).toBe(record.email);
    expect(await findByToken(bucket, newToken())).toBeNull();
    expect(await findByToken(bucket, '../index/email')).toBeNull();
  });

  it('ignores an index pointer that leads outside signups/', async () => {
    const { bucket, store } = fakeBucket();
    const token = newToken();
    store.set(`index/token/${token}.json`, JSON.stringify({ key: 'private/chapter-one.pdf' }));
    expect(await findByToken(bucket, token)).toBeNull();
  });

  it('writes the record before its indexes', async () => {
    const { bucket, store } = fakeBucket();
    const record = subscriber();
    const key = recordKey(record.name, record.email);
    await saveWithIndexes(bucket, key, record);
    expect([...store.keys()][0]).toBe(key);
  });
});

describe('linksFor', () => {
  it('builds confirm and unsubscribe links on the request origin', () => {
    expect(linksFor('http://localhost:8788', 'abc')).toEqual({
      confirmUrl: 'http://localhost:8788/api/confirm?token=abc',
      unsubscribeUrl: 'http://localhost:8788/api/unsubscribe?token=abc',
    });
  });
});
