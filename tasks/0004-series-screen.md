---
id: 0004
title: Series screen (collection progress)
state: todo
module: routes/series + lib/db
created: 2026-07-22
updated: 2026-07-23
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
- This screen owns the **UI**: the per-series cards, the add-time series section,
  and the discovery **review UI** (both library-wide and single-book triggers,
  letting the user fix/fill the best-effort roster).
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

- [ ] Cards render real seeded series; counts correct
- [ ] Strings via `t()` (en + sk); `npm run check` clean
