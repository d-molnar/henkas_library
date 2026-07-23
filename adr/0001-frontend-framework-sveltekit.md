---
id: 0001
title: Frontend framework — SvelteKit (SPA + PWA)
status: accepted
date: 2026-07-22
supersedes: null
superseded_by: null
---

## Context

Henka's Lib is a personal, offline-capable book library rendered from a custom
CSS design system ("Organic"). Requirements: first-class PWA/offline support,
local-first (no backend), and a component model that doesn't impose its own
styling over the hand-written design system. Candidates weighed: Vite+React
(vite-plugin-pwa), Nuxt (@vite-pwa/nuxt), SvelteKit (@vite-pwa/sveltekit), and
Ionic. PWA capability is effectively equal across the Vite-based options (all
Workbox); Ionic ships heavy component styling that would fight the design system.

## Decision

Use **SvelteKit** (Svelte 5, runes) with **adapter-static** in SPA mode
(`fallback: index.html`, `ssr = false`, `prerender = false`) and
**@vite-pwa/sveltekit**. The app is a pure client-side SPA.

## Consequences

- Tiny bundles, no styling conflicts with the Organic CSS, simple offline story.
- No SSR/SEO — acceptable for a personal, installed app.
- Any static host can serve it; no server to run or pay for.
- Team must be comfortable with Svelte 5 runes (`$state`, `$derived`, `$effect`).
