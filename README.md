# kevinminn.com

Personal site for Kevin Minn. Builder, writer, archivist of becoming.

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com). Deployed on [Cloudflare Workers](https://workers.cloudflare.com).

## Stack

- **Framework:** Astro 7
- **Styling:** Tailwind CSS 3 + scoped component styles
- **Type system:** TypeScript (strict)
- **Tests:** Vitest
- **Hosting:** Cloudflare Workers (via `@astrojs/cloudflare`), with R2 for storage
- **Registrar:** Porkbun (DNS pointed at Cloudflare)
- **Fonts:** Fraunces (display) + Inter (UI), via Google Fonts

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:4321

## Build & test

```bash
npm run build
npm test
```

The build lands in `dist/client` (static assets) and `dist/server` (the worker).
It is not a flat `dist/`.

Note that `npm run dev` cannot run server-rendered routes (the vault, `/api/*`)
on the current Astro version. Test those against the built worker instead. See
[`docs/DEPLOY.md`](./docs/DEPLOY.md).

## Project structure

```
/
├── public/
│   ├── assets/        # static images including portrait.jpg
│   ├── _headers       # security and caching headers
│   ├── _redirects     # redirects
│   ├── favicon.svg    # SVG favicon
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── Footer.astro
│   │   ├── Interstitial.astro    # the quote curtain
│   │   ├── Nav.astro             # top navigation
│   │   ├── PhotoSide.astro       # left half of home
│   │   └── WelcomeSide.astro     # right half of home
│   ├── layouts/
│   │   └── Base.astro            # HTML shell, meta, scripts
│   ├── lib/
│   │   ├── consent.ts            # signup consent notice, single source of truth
│   │   ├── email.ts              # Resend confirmation email
│   │   └── vault/                # cookie signing, path sanitization
│   ├── middleware.ts             # auth guard for /vault and /api/vault
│   ├── pages/
│   │   ├── index.astro           # home (locked, no scroll)
│   │   ├── ventures.astro
│   │   ├── writing.astro
│   │   ├── notify.astro          # book release signup
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── api/                  # subscribe + vault endpoints
│   │   └── vault/                # password-gated file browser
│   └── styles/
│       └── global.css            # Tailwind directives, font import, shared components
├── scripts/postbuild.mjs         # strips legacy_env so wrangler can deploy
├── tests/                        # vitest
├── docs/DEPLOY.md                # deployment runbook
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

## Design system

| Token        | Value      | Use                              |
| ------------ | ---------- | -------------------------------- |
| paper        | `#FBF8F3`  | background (warm cream)          |
| paper-2      | `#F4EFE6`  | interstitial / accent surfaces   |
| ink          | `#1C1A17`  | primary text                     |
| ink-soft     | `#4A453D`  | secondary text                   |
| ink-faint    | `#8A8479`  | tertiary / metadata text         |
| line         | `#E8E1D2`  | hairline rules                   |
| accent       | `#B4543E`  | terracotta accent                |
| accent-soft  | `#D89B7E`  | accent on dark backgrounds       |

Fonts:

- **Fraunces** weights 300 / 400 / 500 (italic enabled)
- **Inter** weights 400 / 500 / 600

## Deployment

This deploys to **Cloudflare Workers, not Pages**. The full runbook, including
secrets, the R2 bucket, and the known traps, is in
[`docs/DEPLOY.md`](./docs/DEPLOY.md).

```bash
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

DNS is on Cloudflare nameservers via Porkbun.

## Things that are intentional

- **Home page does not scroll.** It locks to one viewport.
- **The quote interstitial** triggers on every internal `[data-interstitial-link]` click, auto-dismisses after 4 seconds, dismisses on any click.
- **Photo is full-bleed** on the left half of the home page, edge to edge.
- **No em dashes** in copy text (per Kevin's standing rule). The em dash in the quote is intentional and required.

## Things to do next

- Add an OG image at `/public/assets/og.jpg` (1200x630).
- Optimize the cover and logo PNGs; several are multi-megabyte and one is the homepage hero.
- Point the DriftLab HQ beta form at `/api/subscribe` instead of `mailto:`.
