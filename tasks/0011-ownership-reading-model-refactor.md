---
id: 0011
title: Refactor ownership into a discriminated union (reading orthogonal)
state: done
module: lib/types + lib/db + shelf/detail/form
created: 2026-07-23
updated: 2026-07-23
depends_on: []
---

## Goal

Implement ADR 0008. Replace the flat `Book` (with `copies === 0` meaning
wishlist and an always-present `status`) with a discriminated union on `owned`,
keeping reading fields common. After this task, a wishlist book cannot carry an
owned-only field, `copies: 0` is unrepresentable, and the compiler forces
narrowing on `owned`. No module split yet (that's task 0012) — all changes stay
inside today's file layout.

## Context / where it lives

- `src/lib/types.ts` — the `Book` shape, `isOwned`/`isWishlist`, `READING_STATUSES`.
- `src/lib/db.ts` — Dexie schema + all mutations (`addBook`, `setCopies`,
  `addCopy`, `setStatus`, `updateProgress`, `setRating`, `markFinished`, backup).
- `src/lib/seed.ts` — starter data (owned books, 3 wishlist entries).
- `src/lib/components/BookForm.svelte` — "Copies owned" number (0 = wishlist).
- `src/routes/+page.svelte` — shelf: wishlist section via `copies === 0`, status groups.
- `src/routes/book/[id]/+page.svelte` — detail: copies, add-copy, inventory, status.
- `src/lib/components/BookCard.svelte`, `src/lib/stats.ts` — read copies/status.

## Plan

Step-by-step implementation plan (TDD for the pure transition logic):
`docs/superpowers/plans/2026-07-23-ownership-union-refactor.md`.

## Approach

1. **types.ts** — define the union per ADR 0008:
   `BookCore` (work + reading fields) intersected with
   `{ owned:true; copies; format?; pricePaid?; estValue? }` or
   `{ owned:false; wanted:boolean; estValue? }`. Export `OwnedBook`/`WishedBook`.
   Turn `isOwned`/`isWishlist` into type guards (`b is OwnedBook`, etc.).
2. **db.ts schema** — bump Dexie to v3; keep the same *indexes* (`owned` is NOT
   indexable — boolean); `.upgrade()` clears books/series/loans (reseed). Keep
   `isbn`, `status`, `seriesId`, `addedAt`, `finishedAt` indexes.
3. **db.ts mutations** — variant-aware:
   - `addBook` builds an `OwnedBook` (copies 1) by default; an explicit wishlist
     add builds `{ owned:false, wanted:true }`.
   - `setCopies(id, n)`: `n >= 1` → owned with `copies:n`; `n <= 0` → rebuild as
     `{ owned:false, wanted:false }`. **Use `db.books.put(rebuilt)`** on any
     variant switch so stale keys from the other variant don't linger.
   - `addCopy(id)`: increment on owned; acquire (→ owned, copies 1) on unowned.
   - `setWanted(id, wanted)`: toggle on unowned; no-op on owned.
   - Reading mutations (`setStatus`/`updateProgress`/`markFinished`/`setRating`)
     touch `BookCore` fields only — unchanged in behavior, but verify typing.
4. **seed.ts** — owned entries get `owned:true` (copies default 1); the three
   `copies: 0` entries become `owned:false, wanted:true`. Add one
   `owned:false, wanted:false, status:'completed'` example ("read at a library").
   Update the `Seed`/`make` helper so authoring stays terse.
5. **UI narrowing**:
   - `BookForm`: an ownership control — Owned vs Wishlist. Owned → copies number
     + format/pricePaid/estValue; Wishlist → estValue only. Status always shown.
   - `book/[id]`: guard `book.owned` around the inventory block; keep the status
     select (common). Add-copy/acquire wording via `t()`.
   - shelf `+page.svelte`: Wishlist section = `!b.owned && b.wanted`; status
     groups include everything else (owned or read-but-unowned) by `status`.
   - `BookCard`, `stats.ts`: narrow before reading owned-only fields.
6. **Docs** — update the "Data model" section of `AGENTS.md` to describe the union.

## Definition of done

- [x] `Book` is the discriminated union; `copies: 0` and "owned+wanted" won't type-check
- [x] Guards `isOwned`/`isWishlist` narrow correctly; all call sites narrow on `owned`
- [x] Variant transitions use `put` (no stale fields); reading history preserved across them
- [x] Seed reseeds cleanly (Dexie v3); shelf shows owned status groups + a Wishlist section
- [x] Add/edit form creates both owned and wishlist books correctly
- [x] Strings via `t()` (en + sk) for any new copy
- [x] `npm run check` clean; `npm run build` passes
- [x] `AGENTS.md` data-model section updated to match ADR 0008

## Done notes

Implemented per the plan (`docs/superpowers/plans/2026-07-23-ownership-union-refactor.md`)
and task-2-brief.md, in one atomic commit:

- `types.ts`: `BookCore` + `OwnedBook`/`WishedBook` discriminated union; `isOwned`
  (`b is OwnedBook`) / `isWishlist` (`!owned && wanted`) guards.
- `ownership.ts` (new): pure `withCopies`/`acquired`/`withWanted` transitions,
  TDD'd first — `ownership.test.ts` written and confirmed RED (module missing),
  then implemented and confirmed GREEN (7/7 tests).
- `db.ts`: Dexie bumped to v3 (clears + reseeds, no migration); `addBook`/
  `saveBookEdits` rebuild the right variant from a new `BookInput` shape;
  `setCopies`/`addCopy`/`setWanted` now `put()` a rebuilt row via `ownership.ts`
  instead of patching fields onto a possibly-wrong variant; `updateBook` is
  `Partial<BookCore>` only.
- `seed.ts`: owned/wished variants via an updated `Seed`/`make` helper; added
  "The Dispossessed" as a read-elsewhere (`owned:false, wanted:false,
  status:'completed'`) example.
- `BookForm.svelte`: Year (core field) always visible; Format/Price (owned-only)
  hidden under `{#if !isWish}`.
- `AddBookModal.svelte`, `book/[id]/+page.svelte`, `BookCard.svelte`,
  `+page.svelte` (shelf), `stats.ts`: all narrowed on `book.owned` /
  `isWishlist`.
- i18n: added `detail.wishlist_kicker`, `detail.not_owned_kicker`,
  `detail.acquire` to en.ts and sk.ts.
- `npm run check`: 0 errors (22 "captures the initial value" warnings — the
  17-warning baseline plus 5 new ones from BookForm's additional `initial?.`
  reads for the owned-only field guards; same pre-existing warning category,
  not a new class of issue).
- `npm test`: 7/7 passing. `npm run build`: succeeds (adapter-static wrote the site).
- Step 17 (interactive browser/IndexedDB smoke) was deferred to human
  verification — no browser session available in this environment. Code paths
  for the wishlist panel, "I own this now" acquire flow, copies→0 edit, and
  new-wishlist-add were read through instead; see the task-2 report for detail.

## Follow-ups

- Task 0012 — split `db.ts` into bounded modules (books / lending / tags / series),
  lending depends on books, books never imports lending.
