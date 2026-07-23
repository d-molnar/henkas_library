# Series domain design

**Date:** 2026-07-23
**Task:** 0004 (series screen) — this spec covers the *domain remodel* underneath it.
**Decision record:** to be captured as ADR 0009.

## Problem

The current series model is thin: `Series { id, name, author, totalVolumes }`, with
books positioned by a single `seriesId` + `seriesIndex: number`. It cannot represent
the situations that actually occur in the library:

- **Named missing volumes** — a volume you don't own still has a canonical title, so
  the screen can say "Next: <real title>" and list what's missing by name. A bare
  index on the owned book carries no identity for volumes you don't have.
- **Novellas / half-numbers** — in-between entries (3.5), prequels (0), specials.
  Position is not a clean 1..N integer.
- **Omnibus** — one physical book contains several volumes; it must satisfy a *range*
  of volume slots at once.
- **Multiple editions** — the same volume can be owned as several physical books
  (hardcover + paperback), each with its own ISBN/format/price — or no ISBN at all.

"Available volumes" is **not** unknown for ongoing series — it is the count of
currently-published volumes, a known integer that grows over time.

## Decision

Model the **volume as a first-class, edition-agnostic entity** (`SeriesEntry`). Books
link to entries many-to-many. This mirrors the tags-as-entities precedent (ADR 0005),
keeps ISBN an attribute of the owned book (ADR 0006), and keeps the reading axis
orthogonal to ownership (ADR 0008).

Rejected alternatives:
- **Entries embedded on the Series row** — editing one entry rewrites the whole series
  row and book→entry links point into an embedded array; breaks the entities-as-rows
  convention for no gain.
- **Enriched index on the book** (`seriesOrdinals: number[]`) — cannot name missing
  volumes, which is a hard requirement.

## Entities

```ts
// Abstract volume — canonical, edition-agnostic. Exists whether or not you own it.
interface SeriesEntry {
  id: string;
  seriesId: string;
  ordinal: number;   // sortable position: 0 (prequel), 1, 2, 3, 3.5 (novella)
  label: string;     // display form: "1", "3.5", "Book 0", "Novella"
  title: string;     // canonical title — known even when unowned ("named missing")
}

interface Series {
  id: string;
  name: string;
  author: string;
  // totalVolumes REMOVED — "currently available" is derived as entries.length
}

interface BookCore {
  // seriesId + seriesIndex REMOVED
  entryIds: string[];  // volumes this book provides:
                       //   []        standalone
                       //   [x]       normal single volume
                       //   [x,y,z]   omnibus
  // …all other fields unchanged
}
```

`isbn`, `format`, `pricePaid`, `estValue` remain on `Book` only — `Book` already *is*
the edition/copy record. `copies` still covers identical duplicates of one edition.

## Relationships & invariants

- An entry belongs to **exactly one** series (`entry.seriesId`).
- Book ↔ entry is **many-to-many**:
  - one book → many entries = **omnibus**;
  - one entry → many books = **multiple editions** of the same volume.
- A book is *in* a series iff it links to ≥1 of that series' entries. Membership lives
  entirely in `entryIds`; there is no `seriesId` on the book to contradict it.
- Invariants enforced by **mutations** (Dexie cannot enforce them):
  - ordinals are unique within a series;
  - all of a book's `entryIds` belong to a single series (no cross-series omnibus).
- "Currently available volumes" `N = entries.length`; it grows by adding an entry when
  a new volume publishes.

## Derived read-model

A pure function in `series.ts`, mirroring `deriveStats`. Ownership is a discriminated
union; reading is an orthogonal boolean (ADR 0008).

```ts
type EntryAcquisition =
  | { kind: 'have';   books: OwnedBook[] }   // ≥1 owned edition
  | { kind: 'wanted'; books: WishedBook[] }  // none owned, ≥1 wishlisted
  | { kind: 'missing' };                      // no owned/wanted book

interface EntrySlot {
  entry: SeriesEntry;
  acquisition: EntryAcquisition;
  read: boolean;    // orthogonal: any linked book is finished
  books: Book[];    // every book linked to this entry (all editions/states)
}

interface SeriesProgress {
  series: Series;
  entries: EntrySlot[];      // sorted by ordinal
  available: number;         // entries.length
  ownedCount: number;        // slots with acquisition 'have'
  readCount: number;         // slots with read === true
  missingCount: number;      // slots with acquisition 'missing'
  nextToRead?: EntrySlot;    // lowest-ordinal owned & !read
  nextToAcquire?: EntrySlot; // lowest-ordinal missing
}

function deriveSeriesProgress(
  series: Series[], entries: SeriesEntry[], books: Book[]
): SeriesProgress[];
```

**Orthogonality falls out for free:** a book read at a library (`owned:false,
wanted:false, status:'completed'`) linked to an entry lands as
`acquisition:'missing'` + `read:true` — "read 4 of 6, own 3" with no special case.

Derivation rules per entry:
- Gather the books whose `entryIds` include this entry's id.
- `acquisition`: `have` if any is an `OwnedBook`; else `wanted` if any is a **wishlist**
  book (`owned:false && wanted:true`, i.e. `isWishlist`); else `missing`. A linked
  `owned:false, wanted:false` book (read-at-library) contributes to neither, so its
  slot is `missing`.
- `read`: any linked book has `status === 'completed'`.
- `ownedCount`/`readCount`/`missingCount` count *slots*, so an omnibus (one book →
  three entries) contributes three owned slots, and two editions of one volume (two
  books → one entry) contribute one owned slot.
- `nextToRead`: lowest-ordinal slot with `acquisition:'have'` and `read:false`.
- `nextToAcquire`: lowest-ordinal slot with `acquisition:'missing'`.

## Write model (mutations in `series.ts`)

- `createSeries(name, author): string`
- `addEntry(seriesId, { ordinal, title?, label? }): string` — `label` defaults to
  `String(ordinal)`, `title` to `Volume ${ordinal}` when unknown; rejects a duplicate
  ordinal.
- `editEntry(entryId, patch)`
- `removeEntry(entryId)` — also removes the id from any book's `entryIds`.
- `deleteSeries(seriesId)` — cascades: delete its entries and unlink them from books.
- `setBookEntries(bookId, entryIds[])` — validates entries exist and share one series.
- `groupBooksIntoSeries(name, author, [{ bookId, ordinal, label?, title? }])` — the
  mockup's "group books into a series" affordance: create the series + entries and link
  the books, entry title defaulting to the book's title.

Dependency direction stays one-directional: `series` reads/writes the shared `books`
table for linking, `books` never imports `series` (consistent with the module split
from task 0012).

## Persistence / seed

Pre-release rule (AGENTS.md dev phase): **no real migration** — bump the schema and
clear + reseed.

- Schema **v4**: add `seriesEntries` table indexed `id, seriesId, ordinal`; on the
  `books` table drop the `seriesId` index and add a `*entryIds` multiEntry index
  (reverse lookup: which books provide an entry).
- Reshape `seed.ts`: add `seedSeriesEntries`; give seed books `entryIds` instead of
  `seriesId`/`seriesIndex`. Seed at least one **omnibus**, one **novella** (half
  ordinal), and one **read-at-library** volume (unowned + completed) so every derived
  state is exercised from first run.

## Testing

Pure unit tests for `deriveSeriesProgress` (vitest, alongside `ownership.test.ts`):

- omnibus: one owned book → three owned slots;
- two editions: two owned books → one owned slot (not double-counted);
- novella: half-ordinal sorts into the right position;
- read-elsewhere: unowned + completed book → slot is `missing` yet `read`;
- `missingCount` and both `next*` pointers;
- ordinal-collision rejection in `addEntry`.

## Module placement

All of this lives in `src/lib/series.ts`: the `series` store, a new `seriesEntries`
store, `deriveSeriesProgress`, and the mutations. If the file grows unwieldy, splitting
entries into their own module is a later follow-up.

## Out of scope (YAGNI / follow-ups)

- The `/series` **screen** itself (task 0004 UI) — this spec is the domain it renders.
- Cross-series crossovers (a book belonging to two series).
- Sub-series / arcs within a series.
- Real data migration (deferred until post-release, per the dev-phase rule).
