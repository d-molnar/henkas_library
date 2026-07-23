---
id: 0005
title: Lending screen (loans)
state: todo
module: routes/lending + lib/db
created: 2026-07-22
updated: 2026-07-22
---

## Goal

Screen 1e: manage loaned books — summary tiles (out now, overdue, all-time),
a table of active loans with "mark returned", a lend action, and a
recently-returned list. Reached via "Manage loans" on the shelf's on-loan area
(not a top-level nav item, per the mockup).

## Context / where it lives

- `loans` table + `seedLoans` exist; `db.ts` has `lendBook`, `returnLoan`,
  `activeLoans` store. A lend modal is stubbed in `ui.svelte.ts` (`openLend`) but
  `ModalHost` doesn't render it yet — add `LendModal`.
- Mockup 1e: 3 summary cards, `.table` of active loans with avatar chips + "out
  for" + nudge tag, returned chips.

## Approach

- New `/lending` route.
- Build `LendModal` (pick borrower name/initials/colour, since date) and wire it
  into `ModalHost` for the `lend` modal kind.
- Compute overdue (> ~3 months) from `loan.since`.
- Link book detail's "Lend this book" and shelf on-loan → this screen.

## Definition of done

- [ ] Lend, return, and the summary/table render from real data
- [ ] Strings via `t()` (en + sk); `npm run check` clean
