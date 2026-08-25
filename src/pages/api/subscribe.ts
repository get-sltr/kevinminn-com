import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CONSENT_TEXT, CONSENT_VERSION } from '../../lib/consent';
import { sendConfirmation } from '../../lib/email';

export const prerender = false;

// Deliberately NOT under /api/vault: the middleware guards that prefix, and this
// endpoint has to be reachable by the public. Everything it writes still lands in
// the vault bucket, so the list is readable from the /vault browser.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 80;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  // Astro v6 removed locals.runtime.env. Read the binding inside the handler,
  // not at module scope, since it is only populated per request.
  const bucket = (env as unknown as ENV).VAULT_BUCKET;

  let payload: { name?: unknown; email?: unknown; website?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Honeypot. A real visitor never sees this field, so anything in it is a bot.
  // Answer with a normal success so it has no signal to retry against.
  if (typeof payload.website === 'string' && payload.website.trim() !== '') {
    return json({ ok: true });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return json({ error: 'Enter a valid email address.' }, 400);
  }

  const name = typeof payload.name === 'string' ? payload.name.trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > MAX_NAME_LENGTH) {
    return json({ error: 'Enter your name.' }, 400);
  }

  // One object per signup. A single rolling file would need read-modify-write,
  // and two people submitting at once would silently lose one of the addresses.
  //
  // The key is the address itself, not a uuid, so the vault listing is readable
  // at a glance. It also dedupes for free: someone signing up twice updates
  // their record instead of leaving two rows you have to open to tell apart.
  const now = new Date().toISOString();
  const slugify = (value: string, max: number) =>
    value
      .toLowerCase()
      .replace(/@/g, '-at-')
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, max);

  // Name first so the vault listing reads as a list of people, not of strings.
  const key = `signups/${slugify(name, 60)}__${slugify(email, 90)}.json`;

  // Store the consent notice verbatim, not just a boolean. If the wording ever
  // changes, each record still shows what that person was actually shown.
  const record = {
    name,
    email,
    signedUpAt: now,
    source: 'remember-my-name',
    consent: {
      version: CONSENT_VERSION,
      text: CONSENT_TEXT,
      method: 'implied by form submission',
    },
  };

  const meta = { httpMetadata: { contentType: 'application/json' } };

  // Write first. The address is the thing we must never lose, so it is stored
  // before anything that can fail over the network is attempted.
  await bucket.put(key, JSON.stringify({ ...record, confirmation: 'pending' }, null, 2), meta);

  // Confirmation is best effort. If Resend is down, misconfigured, or the key is
  // absent, the person is still subscribed and still gets a success response.
  let confirmation: string;
  try {
    const key = (env as unknown as ENV).RESEND_API_KEY;
    const result = await sendConfirmation(email, name, key);
    confirmation = result.sent ? 'sent' : (result.error ?? 'failed');
    // Always log the outcome. Logging only failures hid the case where the key
    // is simply absent, which returns early and looks identical from outside.
    console.log('[subscribe] key present:', Boolean(key), '| confirmation:', confirmation);
  } catch (err) {
    console.error('[subscribe] confirmation threw', String(err));
    confirmation = 'failed';
  }

  // Second write records the outcome, so a failed confirmation is visible in the
  // vault instead of silently unknown. If this write fails the signup still stands.
  try {
    await bucket.put(key, JSON.stringify({ ...record, confirmation }, null, 2), meta);
  } catch {
    /* the pending record is already durable */
  }

  return json({ ok: true });
};
