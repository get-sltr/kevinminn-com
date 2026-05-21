const encoder = new TextEncoder();

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function signCookie(value: string, secret: string): Promise<string> {
  const signature = await hmac(value, secret);
  return `${value}.${signature}`;
}

export async function verifyCookie(
  signed: string,
  secret: string
): Promise<string | null> {
  const dotIndex = signed.indexOf('.');
  if (dotIndex === -1 || dotIndex === 0) return null;

  const value = signed.slice(0, dotIndex);
  const signature = signed.slice(dotIndex + 1);

  const expected = await hmac(value, secret);
  if (signature !== expected) return null;

  return value;
}
