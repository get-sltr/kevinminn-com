import type { APIRoute } from 'astro';
import { signCookie } from '../../../lib/vault/cookie';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const form = await request.formData();
  const password = form.get('password');

  if (typeof password !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing password' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const expected = locals.runtime.env.VAULT_PASSWORD;
  if (password !== expected) {
    return new Response(JSON.stringify({ error: 'Wrong password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secret = locals.runtime.env.VAULT_SECRET;
  const token = crypto.randomUUID();
  const signed = await signCookie(token, secret);

  cookies.set('vault-session', signed, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
