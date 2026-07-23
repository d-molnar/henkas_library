---
id: 0004
title: Series screen (collection progress)
state: todo
module: routes/series + lib/db
created: 2026-07-22
updated: 2026-07-22
---

## Goal

Screen 1d: per-series cards showing stacked spines, "own X of N · read Y", and a
progress bar, plus a way to see missing volumes. Reachable from the nav "Series".

## Context / where it lives

- `series` table + `seedSeries` exist; books carry `seriesId` + `seriesIndex`.
- `series` reactive store exists in `db.ts`.
- Mockup 1d: two-column cards, rotated spine stack, sage progress bar, "Next: …"
  and "N missing" tags, plus a "group books into a series" affordance.

## Approach

- New `/series` route; iterate the `series` store, join books by `seriesId`.
- Derive owned/read counts and missing indices (1..totalVolumes minus owned).
- Reuse `.card`, `.tag`, gradient spines (see `covers.ts` / BookCover).
- Add nav + phone tab entry.

## Definition of done

- [ ] Cards render real seeded series; counts correct
- [ ] Strings via `t()` (en + sk); `npm run check` clean
