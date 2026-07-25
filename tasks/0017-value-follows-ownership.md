---
id: 0017
title: Value follows ownership — paid or estimated, never both
state: done
module: lib/types + lib/ownership + lib/books + components/BookForm
created: 2026-07-25
updated: 2026-07-25
depends_on: [0011]
---

## Goal

An owned book showed "Paid €26.00" and "Est. value €31.50" side by side, with
nothing to say which number is *the* number. Make the two mutually exclusive in
the type, not just in the UI.

## What shipped

- `types.ts` — `estValue` moves off `OwnedBook`; it now lives only on
  `WishedBook`. `OwnedBook` keeps `pricePaid`. See ADR 0010.
- `ownership.ts` — the value no longer crosses the ownership boundary:
  `withCopies`/`acquired` drop it in both directions. What a book cost is not
  what replacing it costs.
- `BookForm` — one money field; its label follows the copy count ("Price paid"
  at ≥ 1, "Est. value" at 0), so a value can't be entered in one meaning and
  stored in the other. New key `form.est_value` (en + sk).
- Book detail — the owned panel shows Copies / Format / Paid; the unowned panel
  shows Est. value.
- `stats.ts` — `collectionValue` is now what the shelf cost; `valueVsPaid` is
  deleted (nothing consumed it, and there is no second number to compare).
- `db.ts` — schema **v6**: clear + reseed, no migration (pre-release).
- Seed: owned rows lose their `estValue`; wishlist rows keep theirs.

## Verification

- `npm run check` → 0 errors (22 pre-existing warnings); `npm run build` clean.
- `ownership.test.ts` updated to assert the value is dropped in both directions;
  28/28 green.

## Follow-ups

- A real "what is my collection worth today" feature would need per-copy
  valuations with dates, not one optional float — see ADR 0010's consequences.
  Not captured as a task; it's speculative until someone wants it.
