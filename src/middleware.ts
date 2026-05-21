import { defineMiddleware } from 'astro:middleware';
import { verifyCookie } from './lib/vault/cookie';

const PUBLIC_PATHS = ['/vault/login', '/api/vault/auth'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isVaultRoute =
    pathname.startsWith('/vault') || pathname.startsWith('/api/vault');
  if (!isVaultRoute) return next();

  if (PUBLIC_PATHS.includes(pathname)) return next();

  const cookie = context.cookies.get('vault-session')?.value;
  if (!cookie) {
    return context.redirect('/vault/login');
  }

  const secret = context.locals.runtime.env.VAULT_SECRET;
  const value = await verifyCookie(cookie, secret);
  if (!value) {
    context.cookies.delete('vault-session', { path: '/' });
    return context.redirect('/vault/login');
  }

  return next();
});
