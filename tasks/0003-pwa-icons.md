---
id: 0003
title: Generate PWA icons
state: todo
module: static + vite.config
created: 2026-07-22
updated: 2026-07-22
---

## Goal

The web manifest references `/icon-192.png`, `/icon-512.png` (and a maskable
variant) that don't exist yet, so an installed PWA has no custom icon.

## Context / where it lives

- Manifest is in `vite.config.ts` (`SvelteKitPWA({ manifest: { icons: [...] } })`).
- Brand mark exists as `static/favicon.svg` (Organic book glyph, accent #c67139
  on cream #f5ead8).

## Approach

- Produce 192px and 512px PNGs from the book glyph on the cream ground, plus a
  512px **maskable** version with safe-area padding.
- Drop them in `static/`; keep the manifest entries as-is.
- Optionally add an Apple touch icon link in `app.html`.

## Definition of done

- [ ] Icons present; `npm run build` shows no missing-asset warnings for them
- [ ] Installed app shows the icon (verify in a browser)
