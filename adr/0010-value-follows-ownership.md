---
id: 0010
title: The value axis follows ownership — paid or estimated, never both
status: accepted
date: 2026-07-25
supersedes: null
superseded_by: null
---

## Context

ADR 0008 split ownership into a discriminated union but left `estValue` on
**both** variants: "resale value if owned; ballpark acquisition price if wished."
That reads fine in the abstract and falls apart in the UI. The book detail panel
showed, for one owned book:

```
Paid        Est. value
€26.00      €31.50
```

Two money figures side by side, and no answer to the obvious question — which
one is this book's number? They measure different things (a past transaction vs
a present estimate), they are never both actionable at once, and nothing in the
app ever consumed the pair. `deriveStats` had a `valueVsPaid` field computing the
spread; no screen used it, and it existed only because the model made it
expressible.

The underlying error: `estValue` was modelled as a property of a *book*, when it
is really a property of a book *you don't have*. For a book on the shelf the
honest number is what it cost you. What a copy would fetch — or cost to replace —
is a question about a copy you'd have to go and get.

## Decision

Move the value field onto the variant it belongs to. `OwnedBook` keeps
`pricePaid`; `WishedBook` keeps `estValue`; neither has the other.

```ts
interface OwnedBook extends BookCore {
  owned: true;
  copies: number;        // ≥ 1
  format?: string;
  pricePaid?: number;    // what it cost you — a fact
}

interface WishedBook extends BookCore {
  owned: false;
  wanted: boolean;
  estValue?: number;     // what it would cost — an estimate
}
```

**The value does not cross the ownership boundary.** `withCopies` and `acquired`
drop it in both directions: acquiring a wished book clears the estimate (you now
know what you actually paid, or you paid nothing and the field is empty), and
giving away an owned book leaves the estimate unset rather than back-filling it
from the old purchase price. What a book cost in 2019 is not what replacing it
costs today, and silently presenting one as the other is the failure this ADR
exists to prevent.

The **form** shows a single money field whose label follows the copy count —
"Price paid" at ≥ 1 copy, "Est. value" at 0 — so the input can't be filled in
one meaning and stored in the other.

## Consequences

- The "which number is this?" ambiguity is gone by construction: a book has at
  most one money figure, and its variant says what that figure means.
- `LibraryStats.collectionValue` now means **what the owned shelf cost**, summed
  over copies. `valueVsPaid` is deleted — there is no second number to compare
  against. If a real "what is my collection worth today" feature ever lands, it
  needs its own model (per-copy valuations with dates, not one optional float),
  and this ADR should be revisited rather than quietly widened.
- Editing an owned book to 0 copies loses the paid price, by design — it is no
  longer a fact about anything you hold. Users who want that history need a
  disposal log, which is out of scope.
- Consumers already narrow on `owned` (ADR 0008), so the compiler catches every
  site that read `estValue` off an owned book.
- Pre-release, no migration: Dexie **v6** clears and reseeds (`src/lib/seed.ts`),
  consistent with 0008/0009.
