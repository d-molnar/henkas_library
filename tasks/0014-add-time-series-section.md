---
id: 0014
title: Add-time series section in BookForm
state: todo
module: components/BookForm + lib/series
created: 2026-07-25
updated: 2026-07-25
depends_on: [0004]
---

## Goal

While adding or editing a book, the user can say which series volume(s) it
provides — pick an existing series, fill a named-missing slot, or create a new
series + entry inline. Ends with the book's `entryIds` set.

## Context / where it lives

- The domain is done (task 0013): `matchLocalSeries` proposes a match from what
  already exists locally (title→entry beats author→series, never the network),
  `ensureSeries`/`ensureEntry`/`setBookEntries` do the writes.
- `BookInput.entryIds` already exists and is mapped in `coreFromInput`
  (`books.ts`), so the form just needs to produce the ids.
- Split out of task 0004, which shipped the read-only `/series` screen.

## Approach

- New section in `BookForm.svelte`, below tags: series picker (existing series
  by name) + volume picker (entries of that series, unfilled slots first) +
  "new series" inline fields.
- On open, run `matchLocalSeries` over the current title/author and pre-select
  the suggestion, clearly marked as a suggestion the user can drop.
- Omnibus case: allow selecting several entries of the one series (`entryIds` is
  an array; `setBookEntries` already rejects entries spanning two series).

## Definition of done

- [ ] Adding a book into an existing series links it to the right entry
- [ ] Filling a named-missing slot (e.g. Earthsea "Tales from Earthsea") works
- [ ] Creating a series inline works and shows up on `/series`
- [ ] Strings via `t()` (en + sk); `npm run check` clean

## Follow-ups
