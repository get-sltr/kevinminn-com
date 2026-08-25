# Deploying kevinminn.com

Everything a future session needs to get this site live, plus the traps that
cost real time. Written 2026-08-24.

## The single most important fact

**This site deploys to Cloudflare Workers, not Cloudflare Pages.**

`@astrojs/cloudflare` v14 dropped Pages support. Its README reads "An SSR adapter
for use with Cloudflare Workers targets." The repo was originally on Pages via a
GitHub integration, and the adapter switch (commit `e9eacbf`) silently broke that
pipeline. Between May and August 2026 the Pages build could no longer produce a
working site, so Cloudflare kept serving the last good deployment. The live site
was months stale: no vault, no ventures content, and an interstitial that fired on
every click.

If a future session finds the live site behind again, check this first. A green
git history does not mean anything shipped.

## Build output shape

`npm run build` produces:

```
dist/client/          static assets, _headers, _redirects   (the ASSETS binding)
dist/server/          entry.mjs worker + generated wrangler.json
```

It is **not** a flat `dist/`. Any Cloudflare project setting that names `dist` as
the publish directory is wrong for this repo.

## Prerequisites

1. `wrangler login` (interactive, opens a browser; cannot be done by an agent)
2. R2 bucket `km-v` must exist in the account
3. Secrets set on the Worker:

| Secret | If missing |
|---|---|
| `VAULT_PASSWORD` | Vault login always rejects |
| `VAULT_SECRET` | Vault routes 500. HMAC refuses a zero-length key, so this throws rather than failing gracefully |
| `RESEND_API_KEY` | Signups still work and still persist; the confirmation email is skipped and the record stores `confirmation: "not_configured"` |

Set them with `wrangler secret put <NAME>`. Never put real values in
`wrangler.toml`, and never commit `.dev.vars`.

## Deploy

```bash
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

Deploy to the `*.workers.dev` URL first and verify there before touching the
custom domain. `kevinminn.com` currently belongs to the old Pages project. A
hostname can only be attached in one place, so going live means removing it from
Pages and adding it to the Worker. That swap causes brief downtime and is
reversible.

## Verifying a deploy

Check these, because a green build proves nothing about runtime bindings:

- `/` shows the book cover, uncropped
- `/ventures` lists Nourished by Mira, DriftLab HQ, Project AIR, Axiisium, Amyneion
- `/vault` redirects to `/vault/login`; the password works; a folder can be created
- `/notify` accepts an email, and a record appears under `signups/` in the vault
- The confirmation email actually arrives

## Traps, all of which cost time already

### `legacy_env` breaks every deploy
The adapter writes `legacy_env: true` into `dist/server/wrangler.json` on every
build. Wrangler 4 removed that field and hard-errors on it. `scripts/postbuild.mjs`
strips it and is wired into `npm run build`. **Do not delete that script** until the
adapter stops emitting the field. Removing it changes nothing about deployment:
`legacy_env = true` was the old default.

### `npm run dev` cannot run any SSR route
Astro 7.0.3's JSON logger calls `process`, which does not exist in workerd. It
crashes while logging, so every SSR error surfaces as `process is not defined`
and the real error is lost. This affects all vault routes, `/api/subscribe`, and
`/notify`'s endpoint. Static pages are fine.

**Test SSR against the built worker instead:**

```bash
npm run build
cp .dev.vars dist/server/.dev.vars     # see below
npx wrangler dev --config dist/server/wrangler.json --port 8788
```

Astro 7.2.6 exists and may fix the logger bug. Upgrading is a dependency change,
so it needs approval first.

### `.dev.vars` must sit next to the config, not in the repo root
Wrangler resolves `.dev.vars` relative to the config file. With
`--config dist/server/wrangler.json` it looks in `dist/server/`. A root `.dev.vars`
is ignored, and the symptom is confusing: the correct vault password returns 401,
because `VAULT_PASSWORD` is undefined. Copy the file into `dist/server/` before
running wrangler dev. `dist/` is gitignored, and `.dev.vars` is too.

### Form POSTs need an Origin header when testing with curl
Astro's CSRF protection rejects cross-site form submissions with
`403 Cross-site POST form submissions are forbidden`. Browsers send `Origin`
automatically; curl does not. Add `-H "Origin: http://localhost:8788"` when
testing `/api/vault/auth`. JSON `fetch` posts such as `/api/subscribe` are
unaffected.

### `Astro.locals.runtime.env` no longer exists
Removed in Astro v6. Every binding is read as:

```ts
import { env } from 'cloudflare:workers';
const bucket = (env as unknown as ENV).VAULT_BUCKET;
```

Read it **inside** the handler, never at module scope, since it is only populated
per request. The whole vault was written against the old API and every route
500ed until this was fixed. If a new endpoint 500s on any binding access, this is
almost certainly why.

## Where the data lives

R2 bucket `km-v`, one bucket for everything:

- Vault files: arbitrary keys, with zero-byte `<path>/.folder` markers standing in
  for directories, since R2 has no real ones
- Book signups: `signups/<iso-timestamp>-<uuid>.json`, one object per signup

One object per signup is deliberate. A single rolling list would need
read-modify-write, and two simultaneous submissions would silently lose an address.
Both show up in the `/vault` browser.

## Email

Confirmation mail goes through Resend over plain `fetch`, so it adds no dependency.
Sending domain must be verified in Resend with DKIM and SPF records on
`kevinminn.com`. From is `Kevin Minn <hello@kevinminn.com>` with `Reply-To:
info@kevinminn.com`.

Sending is best effort by design: `/api/subscribe` writes the record to R2 *before*
attempting mail, then records the outcome in a second write. A mail outage must
never cost a subscriber.

## Mail routing

Active forwards: `press@`, `no-reply@`, `info@`, `kevin@`, `hello@`. The catch-all
is set to **Drop**, so any address that is not on that list vanishes with no bounce.
Before putting a new address in site copy, confirm it exists. The site used
`hello@` for months while it was unrouted, meaning that mail was being discarded.
