---
id: 0008
title: Ownership as a discriminated union; reading is orthogonal
status: accepted
date: 2026-07-23
supersedes: 0004
superseded_by: null
---

## Context

ADR 0004 derived ownership from `Book.copies` (`copies === 0` ⇒ wishlist) and
kept a single always-present `status`. That fused three independent ideas into
one number and left illegal states representable:

- A **wishlist** book (`copies === 0`) still carried a reading `status`, so the
  UI happily showed "a book you don't own is *completed*/*reading*". This was the
  bug that started this ADR.
- `copies` conflated **ownership count** with **desire** ("I wish I had this")
  with **catalog presence**. But you can read a book you don't own (10 pages in a
  library), and wanting a book says nothing about whether you've read it.

The real domain has **two orthogonal axes**:

- **Reading** — `to-read | reading | completed | wont-read`, progress, rating.
  Your relationship with the *text*. Valid whether or not you own a copy.
- **Ownership** — how many copies you hold, or (if none) whether you *want* one.
  `copies` is a pure owned count of books **wherever they physically are** —
  lent-out copies still count; lost/destroyed ones you decrement.

"Catalog presence" is not a third field — a `Book` is in the library simply by
existing. Lending is **not** part of this model: it's a separate concern that
caps active loans at `copies` on its own side; the core book model never
references loans (see the module-boundary follow-up, task 0012).

## Decision

Model ownership as a **discriminated union** so illegal states can't be typed,
and keep reading as **common** fields present on every variant:

```ts
interface BookCore {           // the work + reading axis (always present)
  id; title; author; pages;
  isbn?; year?; publisher?; seriesId?; seriesIndex?;
  tagIds; notes?; cover; coverImage?; addedAt;
  status: Status; currentPage: number; startedAt?; finishedAt?; rating?;
}
type Book =
  | (BookCore & { owned: true;  copies: number /* ≥1 */; format?; pricePaid?; estValue? })
  | (BookCore & { owned: false; wanted: boolean; estValue? });
```

- `owned` is the discriminant (a boolean literal). **Stored but not indexed** —
  IndexedDB keys can't be booleans, and the personal library is small enough to
  filter in memory (the app already `toArray()`s all books).
- **Wishlist** is a derived view: `owned === false && wanted === true`.
- Guards replace the old helpers: `isOwned(b): b is Owned = b.owned`,
  `isWishlist(b) = !b.owned && b.wanted`.

**Transitions** (variant switches rebuild the row with `db.books.put`, not
`update`, so stale fields from the other variant don't linger):

| From | Action | To |
|------|--------|----|
| unowned | acquire / set copies ≥1 | `{ owned:true, copies }`, reading preserved |
| owned | set copies to 0 (lost/gave away) | `{ owned:false, wanted:false }`, reading preserved |
| unowned | want / un-want | `wanted` toggled |

Because reading lives in `BookCore`, **every transition preserves reading
history** — losing your last copy of a book you finished keeps it `completed`.

## Consequences

- **Illegal states gone:** `copies: 0` is unrepresentable (not-owning is a
  different shape); "owned *and* wished" is unrepresentable (`wanted` exists only
  on the unowned variant); reading is never gated by ownership.
- **New coherent state:** `{ owned:false, wanted:false, status:'completed' }` —
  "read it elsewhere, don't own it, don't need it" — which 0004 could not express.
- Consumers must **narrow on `owned`** before reading `copies`/`format`/`pricePaid`
  (owned) or `wanted` (unowned). This is the point: the compiler enforces it.
- `estValue` stays on both variants (resale value if owned; ballpark acquisition
  price if wished).
- Pre-release, no migration: bump the Dexie version, clear, and reseed
  (`src/lib/seed.ts`).
- `wanted` is a plain boolean for now; want-strength/priority is a deferred YAGNI.
