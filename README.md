# kevinminn.com

Personal site for Kevin Minn. Builder, writer, archivist of becoming.

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com). Deployed on [Cloudflare Pages](https://pages.cloudflare.com).

## Stack

- **Framework:** Astro 5
- **Styling:** Tailwind CSS 3 + scoped component styles
- **Type system:** TypeScript (strict)
- **Hosting:** Cloudflare Pages
- **Registrar:** Porkbun (DNS pointed at Cloudflare)
- **Fonts:** Fraunces (display) + Inter (UI), via Google Fonts

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:4321

## Build & preview

```bash
npm run build
npm run preview
```

The production bundle lands in `dist/`.

## Project structure

```
/
├── public/
│   ├── assets/        # static images including portrait.jpg
│   ├── _headers       # Cloudflare Pages headers (security, caching)
│   ├── _redirects     # Cloudflare Pages redirects
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
│   ├── pages/
│   │   ├── index.astro           # home (locked, no scroll)
│   │   ├── ventures.astro        # stub
│   │   ├── writing.astro         # stub
│   │   ├── about.astro           # stub
│   │   └── contact.astro
│   └── styles/
│       └── global.css            # Tailwind directives, font import, shared components
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

## Deployment (Cloudflare Pages)

1. Push this repo to GitHub.
2. In Cloudflare → **Pages** → **Create application** → **Connect to Git**.
3. Select the repo.
4. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** 20
5. Save and deploy.
6. Cloudflare → **Pages** → project → **Custom domains** → add `kevinminn.com` and `www.kevinminn.com`. Cloudflare auto-issues TLS via Universal SSL.

DNS is already on Cloudflare nameservers via Porkbun, so no DNS work is needed.

## Things that are intentional

- **Home page does not scroll.** It locks to one viewport.
- **The quote interstitial** triggers on every internal `[data-interstitial-link]` click, auto-dismisses after 4 seconds, dismisses on any click.
- **Photo is full-bleed** on the left half of the home page, edge to edge.
- **No em dashes** in copy text (per Kevin's standing rule). The em dash in the quote is intentional and required.

## Things to do next

- Replace placeholder portrait with the final shot if/when one comes in.
- Build out ventures / writing / about content (currently stubs).
- Add an OG image at `/public/assets/og.jpg` (1200x630).
- Wire Substack/Newsletter signup on the writing page when ready.
