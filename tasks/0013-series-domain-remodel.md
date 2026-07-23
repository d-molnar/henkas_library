---
id: 0013
title: Series domain remodel (volumes as entities)
state: done
module: lib/series + lib/types + lib/db
created: 2026-07-23
updated: 2026-07-23
depends_on: [0012]
---

## Goal

Remodel the series domain so volumes are first-class, edition-agnostic entities
that books link to many-to-many, with a pure progress derivation and the
detection logic that populates series locally (add-time) and from external
knowledge (discovery). This delivers the domain the `/series` screen (0004) and
the discovery review UI build on — not the screens themselves.

## Context / where it lives

- Design spec: `docs/superpowers/specs/2026-07-23-series-domain-design.md`.
- Plan: `docs/superpowers/plans/2026-07-23-series-domain.md`.
- Decision recorded in **ADR 0009** (series volumes as entities).

## What shipped

- `types.ts` — `SeriesEntry { id, seriesId, ordinal, label, title }`; `BookCore`
  gains `entryIds: string[]` and drops `seriesId`/`seriesIndex`; `Series` drops
  `totalVolumes`.
- `db.ts` — schema **v4**: `seriesEntries` table; the `seriesId` book index
  dropped; pre-release clear + reseed. Seeds an omnibus (Broken Earth trilogy), a
  novella (Kingkiller 2.5), a named-missing volume (Earthsea "Tales from
  Earthsea"), and a read-at-library volume (Earthsea "The Other Wind").
- `series.ts` — `seriesEntries` store; pure `deriveSeriesProgress` (per-volume
  slots: ownership union + orthogonal read flag; `available`/`ownedCount`/
  `readCount`/`missingCount`, `nextToRead`/`nextToAcquire`); series/entry/link
  mutations (`createSeries`/`ensureSeries`/`addEntry`/`ensureEntry`/`editEntry`/
  `removeEntry`/`deleteSeries`/`setBookEntries`); detection helpers
  (`parseSeriesHint`/`matchLocalSeries`/`detectSeriesCandidates`).
- `openlibrary.ts` — `LookupResult.series?`; pure `parseRosterResponse` + thin
  `fetchSeriesRoster` (best-effort; caller fixes/fills by hand).
- `books.ts` — `BookInput.entryIds`, mapped in `coreFromInput`.

## Verification

- `npm run check` → 0 errors (22 pre-existing warnings); `npm run build` → done.
- New pure unit tests: `series.test.ts` (deriveSeriesProgress + detection),
  `openlibrary.test.ts` (parseRosterResponse). Full suite green.
- A vitest `$app/environment` stub + alias was added (`src/test-stubs/`,
  `vitest.config.ts`) so pure-logic tests can import domain modules that
  transitively pull in `db.ts`.
