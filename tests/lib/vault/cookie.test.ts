import { describe, it, expect } from 'vitest';
import { signCookie, verifyCookie } from '../../../src/lib/vault/cookie';

const SECRET = 'test-secret-key-at-least-32-chars-long!!';

describe('signCookie', () => {
  it('returns a string with value and signature separated by a dot', async () => {
    const result = await signCookie('session-token', SECRET);
    const parts = result.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe('session-token');
    expect(parts[1]).toBeTruthy();
  });

  it('produces different signatures for different values', async () => {
    const a = await signCookie('value-a', SECRET);
    const b = await signCookie('value-b', SECRET);
    expect(a.split('.')[1]).not.toBe(b.split('.')[1]);
  });

  it('produces different signatures for different secrets', async () => {
    const a = await signCookie('same-value', 'secret-one-that-is-long-enough!!!');
    const b = await signCookie('same-value', 'secret-two-that-is-long-enough!!!');
    expect(a.split('.')[1]).not.toBe(b.split('.')[1]);
  });
});

describe('verifyCookie', () => {
  it('returns the value for a valid signed cookie', async () => {
    const signed = await signCookie('hello', SECRET);
    const result = await verifyCookie(signed, SECRET);
    expect(result).toBe('hello');
  });

  it('returns null for a tampered value', async () => {
    const signed = await signCookie('hello', SECRET);
    const tampered = 'tampered.' + signed.split('.')[1];
    const result = await verifyCookie(tampered, SECRET);
    expect(result).toBeNull();
  });

  it('returns null for a tampered signature', async () => {
    const signed = await signCookie('hello', SECRET);
    const tampered = signed.split('.')[0] + '.badsignature';
    const result = await verifyCookie(tampered, SECRET);
    expect(result).toBeNull();
  });

  it('returns null for malformed input', async () => {
    expect(await verifyCookie('no-dot-here', SECRET)).toBeNull();
    expect(await verifyCookie('', SECRET)).toBeNull();
  });
});
