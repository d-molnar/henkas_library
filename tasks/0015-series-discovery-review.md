---
id: 0015
title: Series discovery review UI (roster fix-up)
state: todo
module: routes/series + lib/series + lib/openlibrary
created: 2026-07-25
updated: 2026-07-25
depends_on: [0004]
---

## Goal

A review screen that turns the *best-effort* external series data into series
the user actually agreed to: group already-shelved books into a detected series,
show the fetched roster, and let the user fix ordinals/titles, drop junk rows,
and add volumes by hand before anything is written to the DB.

## Context / where it lives

- Detection helpers shipped in task 0013: `detectSeriesCandidates(books, hints)`
  groups books by the series named in their external hints (roster starts
  empty); `fetchSeriesRoster` fills the roster, best-effort — it is explicitly
  the caller's job to let the user correct it. `parseSeriesHint` handles
  "Name #1" / "Name (1)" / "Name, Book 2".
- Two entry points per the design spec: **library-wide** (scan the shelf) and
  **single-book** (from a book detail page).
- Split out of task 0004, which shipped the read-only `/series` screen.

## Approach

- Review UI: candidate series → editable roster table (ordinal, label, title,
  which local book fills it), with per-row drop and an "add volume" row.
- Nothing is persisted until confirm; then `ensureSeries` + `ensureEntry` per
  row and `setBookEntries` per matched book.
- The network step must be optional — offline, the user can still build the
  roster by hand (every feature works offline).

## Definition of done

- [ ] Library-wide scan produces candidates the user can accept/reject per series
- [ ] Roster rows editable and droppable before any write
- [ ] Offline path (no fetch) works end to end
- [ ] Strings via `t()` (en + sk); `npm run check` clean

## Follow-ups
