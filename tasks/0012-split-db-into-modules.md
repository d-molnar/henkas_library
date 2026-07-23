---
id: 0012
title: Split db.ts into bounded domain modules
state: done
module: lib/db → lib/{books,lending,tags,series}
created: 2026-07-23
updated: 2026-07-23
depends_on: [0011]
---

## Goal

`db.ts` is a god-file: books + reading + ownership + tags + series + loans +
backup all in one place. Split it into modules with clearly defined boundaries
and one-directional dependencies (no heavily interconnected code), per the user's
architecture preference. Pure reorganization — **no behavior change.**

## Context / where it lives

- Today everything is in `src/lib/db.ts` over a single Dexie `HenkaDB`.
- The Dexie instance/schema is shared infrastructure; each module owns the
  *logic* for its table(s), not its own database.

## Approach (sketch — refine when picked up)

Target dependency graph (arrows point to the dependency; no cycles):

```
  tags ─┐
        ├─◄ books (catalog: reading + ownership)  ◄── lending
 series ┘
   all → db (shared Dexie schema/instance)
```

- `lib/db.ts` — keep ONLY the `HenkaDB` class, the `db` singleton, `ensureSeeded`,
  and the `live()` store helper. No domain mutations.
- `lib/books.ts` — `Book` stores + every books-table mutation (add/edit, reading,
  ownership). Knows nothing about loans.
- `lib/lending.ts` — `Loan` store + loan mutations; enforces "active loans ≤
  `copies`" by reading books. One-way arrow: lending → books.
- `lib/tags.ts` — `ensureTag`/`renameTag`/`deleteTag`/`mergeTags` + `tags` store.
- `lib/series.ts` — series store (+ any future series mutations).
- Update imports across components; the shared `db` moves with the class.

## Definition of done

- [x] Each module owns its table's logic; `db.ts` holds only shared infra
- [x] Dependencies are one-directional (lending → books; books never imports lending)
- [x] No behavior change; `npm run check` clean; `npm run build` passes
- [x] Layout section of `AGENTS.md` updated to the new file map

## What landed

Split into six atomic commits, each starting and ending in a green
(`npm run check` clean, build passing) state:

- `lib/tags.ts` — tags store + ensureTag/renameTag/deleteTag/mergeTags
- `lib/series.ts` — series store
- `lib/lending.ts` — loans/activeLoans stores + lendBook/returnLoan
- `lib/backup.ts` — exportBackup/importBackup (spans books+series+loans)
- `lib/books.ts` — books store + bookById + BookInput + all books-table mutations
- `lib/db.ts` — now shared infra only: HenkaDB schema/instance, ensureSeeded, live()

No cross-module import cycles. Cross-table cascades (deleteBook → loans,
deleteTag/mergeTags → books) go through the shared `db.<table>` rather than
importing the sibling module, so module dependencies stay one-directional.
`live()` is now exported from `db.ts` for the domain modules to build stores.

Verification: `npm run check` → 0 errors (22 pre-existing warnings); `npm run
build` passes; `npm test` → 10/10 pass.

## Follow-ups

- Enforcement of "active loans ≤ copies" (task approach mentioned it) was **not**
  added — the pre-refactor code never enforced it, and this task was a
  no-behavior-change reorg. Worth a small follow-up task if we want the invariant
  enforced in `lendBook` (would make lending → books an actual import).
