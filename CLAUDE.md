# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server at http://localhost:4321 (SSR routes 500, see Deployment)
npm run build        # astro build + scripts/postbuild.mjs (see Deployment)
npm run preview      # Serve production build locally
npm run format       # Prettier (Astro + Tailwind plugins)
npm test             # vitest run (all tests)
npm run test:watch   # vitest watch mode

npx vitest run tests/lib/vault/paths.test.ts      # single test file
npx vitest run -t 'blocks directory traversal'    # single test by name
```

No linter beyond TypeScript strict mode (`astro/tsconfigs/strict`, plus `@cloudflare/workers-types`).

Node 22.16.0 (`.node-version`).

## Architecture

Astro 7 + Tailwind 3 + TypeScript strict, deployed on Cloudflare **Workers** via `@astrojs/cloudflare` (v14 dropped Pages support). See `docs/DEPLOY.md`.

**Rendering is hybrid, not fully static.** Public pages prerender at build time. The vault opts out per route with `export const prerender = false`, so those run as Cloudflare Workers with access to `locals.runtime.env`. Any new route needing R2, secrets, or request-time logic must set that flag.

**Layout system:** Public pages use `src/layouts/Base.astro` as their shell (head, meta/OG, fonts, Nav, Interstitial, interstitial script). Props: `title`, `description`, `activePage` (`'welcome' | 'ventures' | 'writing' | 'about' | 'contact'`), `noScroll`, `ogImage`. Vault pages deliberately bypass Base and ship their own `<html>` shell, because they must not carry site nav or be indexable.

**Home page (`index.astro`):** Full-viewport two-column grid, `PhotoSide` (left) and `WelcomeSide` (right). `noScroll` puts `no-scroll` on body, locking `overflow: hidden`.

**Interstitial system (spans 4 files):** A quote curtain that plays on internal navigation.
1. `Base.astro` inline script wires every `[data-interstitial-link]` anchor.
2. `src/components/Interstitial.astro` renders the overlay (quote, progress bar, skip hint).
3. `src/styles/global.css` holds all `.interstitial*` classes.
4. After 4 seconds, or on any click, it navigates to the link's `href`.

Two behaviors here are easy to break and are covered by `tests/layouts/base.test.ts`:
- **It shows once per browser, not on every navigation.** `localStorage['kevinminn-interstitial-seen']` gates it, with an in-memory `seenFallback` for privacy modes that throw on storage access. Do not switch this to `sessionStorage`.
- **It must not intercept** modified clicks (meta/ctrl/shift/alt, non-left button), `target` other than `_self`, cross-origin hrefs, or links to the current path.

To give a new internal link the curtain, add `data-interstitial-link` to the anchor.

**Styling:** Tailwind utilities plus `@layer components` classes in `src/styles/global.css` (nav, footer, interstitial, vault). Page-specific styling lives in scoped `<style>` blocks that hardcode the token hex values rather than referencing Tailwind names. Google Fonts (Fraunces + Inter) load via `@import` in global.css.

## Vault subsystem

A private, password-gated document store at `/vault`, backed by the Cloudflare R2 bucket `km-v` (binding `VAULT_BUCKET`, declared in `wrangler.toml`). Designed in `docs/superpowers/specs/2026-05-20-vault-design.md`.

**Auth flow:** `src/middleware.ts` guards every path under `/vault` and `/api/vault`, allowing only `/vault/login` and `/api/vault/auth` through unauthenticated. It reads the `vault-session` cookie and verifies it with `verifyCookie`; failure deletes the cookie and redirects to the login page. Because the middleware covers the whole prefix, individual API endpoints do not repeat the auth check. Keep it that way, and remember that adding a path to `PUBLIC_PATHS` exposes it completely.

**Reading bindings:** `Astro.locals.runtime.env` was removed in Astro v6 and every route using it 500ed. Bindings are now read as `import { env } from 'cloudflare:workers'` then `(env as unknown as ENV).VAULT_BUCKET`, **inside** the handler rather than at module scope, since it is only populated per request. Any new endpoint touching a binding must do the same.

`src/lib/vault/cookie.ts` signs a random UUID as `value.signature` using HMAC-SHA-256 over `VAULT_SECRET`, base64url encoded. `src/lib/vault/paths.ts` holds the path guards: `sanitizePath` (collapses slashes, strips leading/trailing ones, rejects any `.` or `..` segment), `isValidFilename` (rejects empty, dot names, and anything containing `/`), and `parseFolderPrefix`. Every endpoint that takes a user-supplied key runs it through `sanitizePath` before touching R2. New endpoints must do the same.

**Endpoints** (`src/pages/api/vault/`, all `prerender = false`): `auth` (POST, sets the 7-day HttpOnly/Secure/SameSite=Strict cookie), `logout`, `list` (GET, delimiter-based folder listing), `upload` (POST multipart), `download` (GET, streams from R2 with Content-Disposition), `delete` (DELETE single key), `folder` (POST creates, DELETE removes only when empty).

**Folder convention:** R2 has no directories. Folders are zero-byte `<path>/.folder` marker objects. `list` filters markers out of the file listing, and `folder`'s DELETE treats a prefix containing only markers as empty. Anything walking the bucket needs to account for these markers.

**Getting in:** nothing on the site links to `/vault`, by design. The login has no rate limiting, so an
undiscoverable URL is doing real security work. The private way in is to **triple-tap the terracotta dot
in the footer within 1.2 seconds** (`src/components/Footer.astro`). It is a `<span>`, never an anchor, so
no crawlable link ever points at the vault. Do not add a visible vault link without asking.

**UI:** `src/pages/vault/index.astro` is a single page with inline client JS that calls the endpoints via `fetch`. `login.astro` posts the password form to `/api/vault/auth`.

**Secrets:** `VAULT_PASSWORD`, `VAULT_SECRET`, and `RESEND_API_KEY` are set on the Worker via `wrangler secret put`, never in `wrangler.toml`. For local work they go in `.dev.vars`, which is gitignored. Note that wrangler resolves that file relative to the config, so testing the built worker needs it copied to `dist/server/.dev.vars`.

## Book signup

`/notify` is the signup page for the memoir. It posts JSON to `/api/subscribe`, which sits
**outside** `/api/vault/*` on purpose: the middleware guards that prefix, and this endpoint has to
be public. It still writes into the vault bucket under `signups/`, one object per signup, so the
list is readable from the `/vault` browser.

Order of operations is deliberate. The record is written to R2 *first*, then the confirmation email
is attempted, then a second write records the outcome. A mail failure, a missing API key, or a
Resend outage must never cost a subscriber, so the endpoint returns `ok` regardless.

`src/lib/consent.ts` is the single source of truth for the consent notice. Both the page and the
endpoint import it, so the stored record always matches what the person actually saw. Each record
stores the consent text verbatim plus a version, not a boolean. **Bump `CONSENT_VERSION` whenever
`CONSENT_TEXT` changes**, or old records will misrepresent what was agreed to.

`src/lib/email.ts` sends the confirmation through Resend over plain `fetch`, no dependency. Its text
and HTML builders are pure so they can be tested without network access.

## Tests

Vitest, `tests/**/*.test.ts`, mirroring the `src/` layout. Two distinct styles, and the difference matters:

- `tests/lib/email.test.ts` covers the confirmation copy, including a guard that it contains no em dashes, and that the HTML embeds no remote assets (mail clients block them).
- `tests/lib/vault/*` are real unit tests of `cookie.ts` and `paths.ts` (traversal rejection, signature tampering, encoding edge cases). Treat these as the security regression suite.
- `tests/layouts/base.test.ts` and `tests/pages/ventures.test.ts` do **not** render anything. They `readFile` the `.astro` source and assert on substrings. So `ventures.test.ts` pins exact marketing copy, venture names, external URLs, asset paths, and even CSS widths. Editing `ventures.astro` copy or renaming a logo asset will fail tests that look unrelated to the change. Update the assertions in the same commit, and expect the same brittleness in any new source-text test.

## Design tokens (in `tailwind.config.mjs`)

| Token       | Hex       | Role                           |
|-------------|-----------|--------------------------------|
| paper       | `#FBF8F3` | Background                     |
| paper-2     | `#F4EFE6` | Interstitial / accent surfaces |
| ink         | `#1C1A17` | Primary text                   |
| ink-soft    | `#4A453D` | Secondary text                 |
| ink-faint   | `#8A8479` | Tertiary / metadata            |
| line        | `#E8E1D2` | Hairline rules                 |
| accent      | `#B4543E` | Terracotta accent              |
| accent-soft | `#D89B7E` | Accent on dark backgrounds     |

Fonts: **Fraunces** (serif, weights 300/400/500) for display, **Inter** (sans, weights 400/500/600) for UI.

## Hard rules

1. **No em dashes** in any new copy. The em dash in the Interstitial quote is intentional and stays.
2. **No new dependencies** without explicit approval.
3. **Home page does not scroll.** The `no-scroll` class on body is intentional. Do not remove it.
4. **Interstitial timing is 4 seconds with click-to-skip, shown once per browser.** Do not change the duration or the once-per-browser gate.
5. **Brand colors are locked.** Terracotta `#B4543E` is the personal brand accent. This is deliberately not Vindicara red (`#E63946`).
6. **Copy is locked.** Headline: "Builder, writer, archivist of becoming." Lede: "Some of what I make is software..." Quote: the becoming-someone line. Do not change these.
7. **Security headers** in `public/_headers` must be preserved, including the `no-store` and `noindex` rules on `/vault/*` and `/api/vault/*`, and the matching `Disallow` lines in `robots.txt`.
8. **Ventures, writing, about, and contact hold Kevin's real published copy.** Do not rewrite, extend, or "improve" that prose without being asked. `about` still ends on a "This page is being built" note by choice.
9. **Do not add analytics, forms, CMS, or integrations** without explicit approval.
10. **Never mention J&J anywhere.** Johnson & Johnson, Janssen, or any abbreviation of them must not
    appear in copy, code, comments, alt text, commit messages, or docs. This is a standing
    constraint on the Vindicara and Axiisium material in particular. As of this writing the name
    appears nowhere in the working tree, the build, or git history. Keep it that way.
11. **Never commit vault secrets.** No real values in `wrangler.toml`, and no `.dev.vars` in git.

## Deployment

**Read `docs/DEPLOY.md` before deploying.** Short version:

This deploys to **Cloudflare Workers, not Pages**. `@astrojs/cloudflare` v14 dropped Pages support,
which silently broke the old Pages git integration in May 2026 and left the live site months stale.
Build output is `dist/client` plus `dist/server`, never a flat `dist/`.

```bash
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

Needs `wrangler login` (interactive), the R2 bucket `km-v`, and three secrets: `VAULT_PASSWORD`,
`VAULT_SECRET`, `RESEND_API_KEY`. Domain `kevinminn.com`; DNS on Cloudflare via Porkbun.

Two traps that cost an hour each: `scripts/postbuild.mjs` strips a `legacy_env` field the adapter
emits that wrangler 4 rejects, so **do not delete it**; and `npm run dev` cannot run any SSR route on
Astro 7.0.3 (its logger calls `process`, absent in workerd), so test SSR with `wrangler dev` against
the built worker instead. Both are covered in full in `docs/DEPLOY.md`.

## Repo housekeeping

`AGENTS.md` no longer duplicates this file; it is a pointer, and should stay that way. Two copies drift, and the stale one costs whoever reads it next. `README.md` is the human-facing summary and links to `docs/DEPLOY.md` rather than restating it. When architecture changes, update this file and `docs/DEPLOY.md`.
