---
id: 0010
title: Translatable tag/genre names
state: proposed
module: lib/db + i18n
created: 2026-07-22
updated: 2026-07-22
depends_on: [0002]
---

## Goal

Let genre/label *names* display in the active locale (e.g. "Fantasy" / "Fantasy"
— but "Nature" → "Príroda"). Explicitly deferred for now (user: "translations of
tags don't need to be supported yet"), captured so the model stays honest.

## Context / where it lives

- Tags are entities with stable ids (ADR 0005), so translation is a presentation
  layer over the id — the data model already supports it.
- i18n is `src/lib/i18n` (ADR 0003).

## Approach (when picked up)

- Option A: optional `nameByLocale?: Record<LocaleCode, string>` on `Tag`, with
  `name` as the fallback. Resolve display name via active locale.
- Option B: seed genres as message keys and keep user-created tags literal (hybrid).
- Decide in a short ADR; then surface translation editing in the tag-management
  screen (0002).

## Definition of done

- [ ] Decision recorded as an ADR
- [ ] Genre names localize; user tags still work; `npm run check` clean
