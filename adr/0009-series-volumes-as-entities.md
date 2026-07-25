---
id: 0009
title: Series volumes are first-class entities; books link many-to-many
status: accepted
date: 2026-07-23
supersedes: null
superseded_by: null
---

## Context

The original series model was thin: `Series { id, name, author, totalVolumes }`
plus `seriesId`/`seriesIndex` on each book. A book *was* a volume, at a position,
in one series. That fused several independent ideas and left real shelves
unrepresentable:

- **Named-missing volumes.** A series where you own books 1, 2, and 4 could only
  say "own 3 of `totalVolumes`" — it could not name volume 3, because a volume had
  no existence apart from an owned book. You can't show "missing: *The Farthest
  Shore*" if the missing thing isn't a row.
- **Novellas / half-numbers.** `seriesIndex` as "the Nth book" has no place for a
  2.5 novella that sits between two numbered volumes.
- **Omnibus editions.** One physical book that contains volumes 1–3 has a single
  `seriesIndex` — it cannot provide three volumes at once.
- **Multiple editions.** A hardcover and a paperback of the same volume are two
  books with the same `seriesId`/`seriesIndex`; nothing says they are the *same*
  volume rather than two owned volumes.

The knot is that `seriesIndex`-on-book conflates **the canonical volume** (an
edition-agnostic fact about the work) with **a book you happen to own**.

## Decision

Make the volume a first-class, edition-agnostic entity and let books link to
volumes many-to-many.

```ts
interface Series { id; name; author }          // totalVolumes dropped
interface SeriesEntry {                          // the canonical volume
  id; seriesId; ordinal: number; label: string; title: string;
}
interface BookCore { …; entryIds: string[] }     // seriesId/seriesIndex dropped
```

- A **`SeriesEntry`** is a volume — it exists whether or not you own a book for
  it, so a named-missing volume is just an entry with no linked book. `ordinal` is
  a sortable number (`2.5` for a novella); `label` is the display token (`"2.5"`,
  `"Book 0"`); `title` is the canonical title, known even when unowned.
- **Books link via `entryIds`** (many-to-many): `[]` standalone, `[x]` a single
  volume, `[x, y, z]` an omnibus. Two editions of one volume are two books that
  share the same entry id — a **single** owned volume, not two.
- **`Series` loses `totalVolumes`.** "Currently available" is derived as the
  number of `SeriesEntry` rows; there is no separate stored count to drift.
- **ISBN stays on the book** (ADR 0006) — it identifies an edition, not a volume.
- **Reading stays orthogonal** (ADR 0008) — read/owned are independent axes at the
  volume level too, so "missing yet read" (read at a library, don't own it) is a
  coherent per-volume state.
- **Series knowledge enters two ways.** *Local* add-time matching
  (`matchLocalSeries`) attaches a new book to a series/volume that already exists
  on the shelf and **never fabricates a series**. *External* discovery
  (`detectSeriesCandidates` + `fetchSeriesRoster`) proposes series from metadata,
  library-wide or for a single book, for the user to confirm.

`series.ts` owns the domain: the pure `deriveSeriesProgress` (→ per-volume slots
with an ownership union and an orthogonal read flag), the series/entry/link
mutations, and the detection helpers. `books.ts` does not import `series.ts`
(module boundary, consistent with task 0012); `series.ts` reads/writes the shared
`books` table to keep links consistent when entries are removed.

## Consequences

- **New `seriesEntries` table** (Dexie schema v4). Pre-release policy: no data
  migration — bump the version, clear, and reseed (`ensureSeeded`).
- **Derivation, not storage, is the source of truth** for counts: available =
  entry count, owned/read/missing come from folding books over entries. Nothing to
  keep in sync by hand.
- **External roster data is best-effort.** Open Library's series data is sparse
  and inconsistent (`fetchSeriesRoster` is a thin wrapper over a fuzzy search), so
  the discovery UI must let the user fix and fill the proposed roster by hand.
- **Add-time never creates a series** — it only attaches to what already exists;
  creating series/volumes is an explicit act (discovery review or manual entry).
- The `/series` screen (task 0004) and the discovery review UI build **on** this
  domain; they are out of scope here.

## References

- ADR 0005 — tags as entities (the same "make the referenced thing a row" move).
- ADR 0006 — ISBN as an attribute, not identity (edition vs. volume).
- ADR 0008 — ownership as a discriminated union; reading orthogonal (reused per
  volume).
