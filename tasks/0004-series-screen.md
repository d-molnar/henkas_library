---
id: 0004
title: Series screen (collection progress)
state: done
module: routes/series + lib/db
created: 2026-07-22
updated: 2026-07-25
depends_on: [0013]
---

## Goal

Screen 1d: per-series cards showing stacked spines, "own X of N · read Y", and a
progress bar, plus a way to see missing volumes. Reachable from the nav "Series".

## Context / where it lives

- The series **domain** landed in task 0013 (ADR 0009): volumes are `SeriesEntry`
  entities; books link many-to-many via `entryIds`. `series.ts` exposes what this
  screen consumes:
  - `deriveSeriesProgress(series, entries, books)` → per-series `SeriesProgress`
    with per-volume `EntrySlot`s (ownership union + orthogonal `read`), plus
    `available`/`ownedCount`/`readCount`/`missingCount` and
    `nextToRead`/`nextToAcquire`.
  - `series` and `seriesEntries` reactive stores.
  - series/entry/link mutations and the detection helpers
    (`matchLocalSeries` for add-time, `detectSeriesCandidates` +
    `fetchSeriesRoster` for discovery).
- This screen owns the **read UI**: the per-series cards. The two *write* UIs
  originally listed here — the add-time series section and the discovery review
  UI — were split out into tasks 0014 and 0015, since neither is needed to see
  the shelf's series and both are their own interaction.
- Mockup 1d: two-column cards, rotated spine stack, sage progress bar, "Next: …"
  and "N missing" tags, plus a "group books into a series" affordance.

## Approach

- New `/series` route; feed the `series`/`seriesEntries`/`books` stores into
  `deriveSeriesProgress` and render each `SeriesProgress`.
- Missing/next/owned/read all come from the derivation — no counting in the
  component; "available" is the entry count (no `totalVolumes`).
- Reuse `.card`, `.tag`, gradient spines (see `covers.ts` / BookCover).
- Add nav + phone tab entry.

## Definition of done

- [x] Cards render real seeded series; counts correct
- [x] Strings via `t()` (en + sk); `npm run check` clean

## What shipped

- `routes/series/+page.svelte` — feeds the three stores into
  `deriveSeriesProgress`, sorts by series name, two-column card grid.
- `components/SeriesCard.svelte` — leaning spine stack (one spine per
  `EntrySlot`; owned spines take the linked book's cover gradient, wishlist
  spines are faded, missing ones are dashed outlines), sage ownership bar,
  "own X of N · read Y", `Next: …` / `N missing` (or `Complete`) chips, and an
  expandable volume list linking each filled slot to its book.
- `components/ProgressBar.svelte` — optional `color` + `label` props so the
  series bar can be sage and carry an accessible name.
- Nav: `/series` entry in the topnav and the phone tabbar (Layers icon).

## Verification

- `npm run check` → 0 errors (22 pre-existing warnings); `npm run build` → done;
  vitest 28/28 green. No new logic to unit-test — all counting stays in the
  already-tested `deriveSeriesProgress`.
- Not visually verified in a browser (no browser tooling in that session).

## Follow-ups

- [0014](0014-add-time-series-section.md) — add-time series section in BookForm
- [0015](0015-series-discovery-review.md) — series discovery review UI
