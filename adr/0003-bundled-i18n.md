---
id: 0003
title: Bundled, dependency-free i18n
status: accepted
date: 2026-07-22
supersedes: null
superseded_by: null
---

## Context

The app must be translatable with translations **packaged in the app** (no
network, works offline). Rudimentary translations are acceptable. Options
considered: svelte-i18n, typesafe-i18n, Paraglide, or a small hand-rolled layer.

## Decision

Ship a **tiny, dependency-free i18n** built on Svelte 5 runes
(`src/lib/i18n/index.svelte.ts`): a reactive `t(key, params?)` that reads a
`$state` locale, so every `t()` call in markup re-renders on locale change.
`en.ts` is the source of truth and types `MessageKey`; other locales (`sk.ts`)
are `Partial` maps that fall back to English. Locale is persisted to
localStorage and auto-detected from the browser. Launch locales: English + Slovak.

## Consequences

- Zero runtime deps, fully bundled, offline — matches the requirement exactly.
- Adding a locale = one file; adding a string = a key in `en.ts` (+ optionally others).
- No ICU/plural machinery — interpolation is simple `{name}` substitution; plurals
  are handled per-key and kept rudimentary by design.
- Tag/genre *names* are user data, not message keys — translating them is a
  separate future concern (the entity model in ADR 0005 makes it possible).
