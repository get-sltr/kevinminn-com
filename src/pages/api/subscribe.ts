import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CONSENT_TEXT, CONSENT_VERSION } from '../../lib/consent';
import { sendConfirmation } from '../../lib/email';
import { isRateLimited } from '../../lib/ratelimit';
import {
  actionFor,
  findByEmail,
  isValidToken,
  linksFor,
  newToken,
  recordKey,
  saveWithIndexes,
  writeRecord,
  type Subscriber,
} from '../../lib/subscribers';

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
  const runtime = env as unknown as ENV;
  const bucket = runtime.VAULT_BUCKET;

  // Counted before anything else, so bots and malformed posts use up the limit too.
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (await isRateLimited(bucket, ip, runtime.VAULT_SECRET)) {
    return json({ error: 'Too many attempts. Please try again later.' }, 429);
  }

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

  // One record per address. A confirmed subscriber is left untouched, and the
  // response is the same either way, so the form cannot reveal who is on the list.
  const found = await findByEmail(bucket, email, name);
  if (actionFor(found?.record ?? null) === 'none') {
    return json({ ok: true });
  }

  const now = new Date().toISOString();
  const previous: Partial<Subscriber> = { ...found?.record };
  delete previous.confirmation;

  // Store the consent notice verbatim, not just a boolean. If the wording ever
  // changes, each record still shows what that person was actually shown.
  // The token is kept across resends so every link ever emailed keeps working.
  const record: Subscriber = {
    ...previous,
    name: previous.name ?? name,
    email,
    signedUpAt: previous.signedUpAt ?? now,
    source: 'remember-my-name',
    consent: {
      version: CONSENT_VERSION,
      text: CONSENT_TEXT,
      method: 'implied by form submission',
    },
    status: 'unconfirmed',
    token: isValidToken(previous.token) ? previous.token : newToken(),
    emailResult: 'pending',
  };
  const key = found?.key ?? recordKey(name, email);

  // Write first. The address is the thing we must never lose, so it is stored
  // before anything that can fail over the network is attempted.
  await saveWithIndexes(bucket, key, record);

  // Email is best effort. If Resend is down, misconfigured, or the key is
  // absent, the person is still recorded and still gets a success response.
  let emailResult: string;
  try {
    const apiKey = runtime.RESEND_API_KEY;
    const links = linksFor(new URL(request.url).origin, record.token as string);
    const result = await sendConfirmation(email, links, apiKey);
    emailResult = result.sent ? 'sent' : (result.error ?? 'failed');
    // Always log the outcome. Logging only failures hid the case where the key
    // is simply absent, which returns early and looks identical from outside.
    console.log('[subscribe] key present:', Boolean(apiKey), '| email:', emailResult);
  } catch (err) {
    console.error('[subscribe] email threw', String(err));
    emailResult = 'failed';
  }

  // Second write records the outcome, so a failed email is visible in the
  // vault instead of silently unknown. If this write fails the signup still stands.
  try {
    await writeRecord(bucket, key, { ...record, emailResult });
  } catch {
    /* the pending record is already durable */
  }

  return json({ ok: true });
};
