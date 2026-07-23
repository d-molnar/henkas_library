---
id: 0004
title: Ownership derived from copy count (no `owned` flag)
status: superseded
date: 2026-07-22
supersedes: null
superseded_by: 0008
---

## Context

Early modelling mixed "wishlist" in as a fifth reading status, which let an owned,
half-read book be flipped to "wishlist" — nonsense. The real domain: a book is in
the library because you **own ≥1 copy** or you **wish for it**; if you neither own
nor want it, it isn't in the library at all. Ownership and reading status are
independent axes.

## Decision

Do **not** store an `owned` boolean. Ownership is **derived from `Book.copies`**:
`copies > 0` = owned, `copies === 0` = wishlist. Helpers `isOwned` / `isWishlist`
live in `types.ts`. Reading status is `reading | to-read | completed | wont-read`
only. Buying a wishlisted book = "add a copy" (0 → 1 flips it to owned). The
add/edit form exposes a "Copies owned" number (0 = wishlist), not a toggle.

## Consequences

- One source of truth; impossible to be "owned and on the wishlist" simultaneously.
- Wishlist is a shelf section/filter computed as `copies === 0`, not a status value.
- "Won't read" is a first-class status for books you own but set aside.
- Removing the last copy makes a book a wishlist item; fully removing it is a delete.
