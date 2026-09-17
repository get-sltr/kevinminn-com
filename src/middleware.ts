import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { verifyCookie } from './lib/vault/cookie';

const PUBLIC_PATHS = ['/vault/login', '/api/vault/auth'];

export const onRequest = defineMiddleware(async (context, next) => {
  // www belongs on the apex. Prerendered pages are served straight from the
  // assets binding and never reach this file, and a Workers `_redirects` file
  // cannot match on hostname, so the authoritative rule is the Cloudflare
  // redirect rule in docs/DEPLOY.md. This covers what does reach the worker:
  // /api/* and every vault route.
  if (context.url.hostname.startsWith('www.')) {
    const apex = new URL(context.url);
    apex.hostname = apex.hostname.slice(4);
    return context.redirect(apex.toString(), 301);
  }

  const { pathname } = context.url;

  const isVaultRoute =
    pathname.startsWith('/vault') || pathname.startsWith('/api/vault');
  if (!isVaultRoute) return next();

  if (PUBLIC_PATHS.includes(pathname)) return next();

  const cookie = context.cookies.get('vault-session')?.value;
  if (!cookie) {
    return context.redirect('/vault/login');
  }

  const secret = (env as unknown as ENV).VAULT_SECRET;
  const value = await verifyCookie(cookie, secret);
  if (!value) {
    context.cookies.delete('vault-session', { path: '/' });
    return context.redirect('/vault/login');
  }

  return next();
});
