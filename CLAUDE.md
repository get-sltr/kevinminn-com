# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:4321
npm run build      # Production build to dist/
npm run preview    # Serve production build locally
npm run format     # Prettier (Astro + Tailwind plugins)
```

No test runner. No linter beyond TypeScript strict mode (`astro/tsconfigs/strict`).

## Architecture

Astro 5 + Tailwind 3 + TypeScript strict. Static site deployed on Cloudflare Pages.

**Layout system:** Every page uses `src/layouts/Base.astro` as its shell. Base provides the HTML head (meta, OG, fonts), the Nav component, the Interstitial component, and the interstitial JavaScript. Pages pass props: `activePage` (union type: `'welcome' | 'ventures' | 'writing' | 'about' | 'contact'`), `noScroll`, `title`, `description`.

**Home page (`index.astro`):** A full-viewport two-column grid. `PhotoSide` (left) and `WelcomeSide` (right). The body gets `no-scroll` class via the `noScroll` prop, which locks `overflow: hidden`. This is intentional.

**Interstitial system (spans 4 files):** Navigation between pages goes through a quote curtain overlay. The flow:
1. Any anchor with `data-interstitial-link` attribute triggers the interstitial on click (wired in Base.astro's inline `<script>`).
2. `src/components/Interstitial.astro` renders the overlay markup (quote, progress bar, skip hint).
3. `src/styles/global.css` contains all `.interstitial*` classes (opacity transition, progress bar fill).
4. After 4 seconds (or click-to-skip), the script navigates to the link's `href`.

Adding a new internal link that should use the interstitial: add `data-interstitial-link` to the anchor element.

**Stub pages** (`ventures`, `writing`, `about`, `contact`): All follow the same pattern: Base layout, eyebrow + h1 + lede + back-link, Footer at bottom. Scoped `<style>` blocks with hardcoded color values matching the design tokens. These are placeholders waiting for real content.

**Styling:** Tailwind utility classes plus component classes defined in `src/styles/global.css` under `@layer components` (nav, footer, interstitial). Google Fonts (Fraunces + Inter) loaded via `@import` in global.css.

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
4. **Interstitial timing is 4 seconds with click-to-skip.** Do not change.
5. **Brand colors are locked.** Terracotta `#B4543E` is the personal brand accent. This is deliberately not Vindicara red (`#E63946`).
6. **Copy is locked.** Headline: "Builder, writer, archivist of becoming." Lede: "Some of what I make is software..." Quote: the becoming-someone line. Do not change these.
7. **Security headers** in `public/_headers` (HSTS, nosniff, frame options, permissions policy) must be preserved.
8. **Do not add content to stub pages.** They are placeholders for Kevin to write.
9. **Do not add analytics, forms, CMS, or integrations** without explicit approval.

## Deployment

Cloudflare Pages, connected to GitHub repo `kevinminn/kevinminn-com`. Build command: `npm run build`, output: `dist/`, Node 20. Domain: `kevinminn.com`. DNS is on Cloudflare via Porkbun.
