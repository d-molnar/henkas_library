# Series Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remodel the series domain so volumes are first-class, edition-agnostic entities that books link to many-to-many, with a pure progress derivation and the detection logic that populates series locally (add-time) and from external knowledge (discovery).

**Architecture:** A new `SeriesEntry` entity (the canonical volume) lives beside `Series`; `Book` drops `seriesId`/`seriesIndex` and gains `entryIds: string[]`. A pure `deriveSeriesProgress()` turns `(series, entries, books)` into per-series/per-volume view state (ownership as a discriminated union, reading orthogonal). Thin Dexie mutations manage series/entries/links; pure detection helpers (`matchLocalSeries`, `detectSeriesCandidates`, `parseSeriesHint`) drive the two population flows. All logic lives in `src/lib/series.ts`; the entity type lives in `src/lib/types.ts`.

**Tech Stack:** SvelteKit + TypeScript, Dexie (IndexedDB), Vitest (pure-logic unit tests), Open Library API.

**Design spec:** `docs/superpowers/specs/2026-07-23-series-domain-design.md` — read it first.

## Required reading (before Task 1)

- `AGENTS.md` — project conventions. Non-negotiables that apply here: **module boundaries** (`series` may read/write the shared `books` table but `books` must never import `series`; consistent with task 0012), and the **pre-release rule** — do NOT write a data migration; bump the Dexie version and clear+reseed.
- `adr/0005-tags-as-entities.md`, `adr/0006-isbn-as-attribute-not-identity.md`, `adr/0008-ownership-union-reading-orthogonal.md` — the precedents this design leans on.
- `src/lib/types.ts`, `src/lib/db.ts`, `src/lib/series.ts`, `src/lib/books.ts`, `src/lib/seed.ts`, `src/lib/ownership.test.ts` — the files you will touch or mirror.

## Global Constraints

- **Definition of green:** `npm run check` → **0 errors** (22 pre-existing warnings are expected — do not treat warnings as failures); `npm test` → all tests pass; `npm run build` → completes. Run all three at every task's verify step.
- **Module dependency direction:** `series.ts` may import from `db.ts`, `types.ts`, `ownership.ts`; it may read/write `db.books`. `books.ts` must NOT import `series.ts`.
- **No data migration** (pre-release): schema changes bump the Dexie version and clear+reseed via `ensureSeeded`.
- **Tests are pure-logic only.** This project unit-tests pure functions (see `ownership.test.ts`); it has no IndexedDB test harness and this plan does not add one. Dexie mutations are kept thin and verified by `npm run check`/`build`, exactly like the untested mutations in `books.ts`.
- **No user-facing strings in the domain layer.** These are logic/data modules; `t()` (en+sk) applies to the `/series` screen (task 0004), not here.

## Deviations from the spec (deliberate, with reasons)

1. **No `*entryIds` Dexie index.** The spec mentions one, but `deriveSeriesProgress` loads all books in memory (like `deriveStats`), and `removeEntry`/`deleteSeries` filter in memory — exactly how `deleteTag` handles the un-indexed `tagIds`. YAGNI; drop it.
2. **`addEntry`/`ensureEntry` require an explicit `title`.** The spec's `Volume N` default would bake an English string into the domain; instead the caller supplies the title (seed uses real titles, discovery uses fetched/entered titles, and the task-0004 UI supplies a localized placeholder when the user leaves it blank).
3. **`SeriesEntry` is defined in `types.ts`, not `series.ts`,** so `db.ts` can type its table without importing `series.ts` (which would create a `db → series → db` cycle). The *view* types (`EntrySlot`, `SeriesProgress`, …) stay in `series.ts`.
4. **Mutation edge-cases (duplicate ordinal, ensure-idempotency) are not unit-tested** — see the pure-logic-only constraint above.

## File Structure

- `src/lib/types.ts` — add `SeriesEntry`; add `entryIds` to `BookCore`; remove `seriesId`/`seriesIndex` from `BookCore`; remove `totalVolumes` from `Series`.
- `src/lib/db.ts` — schema v4: add `seriesEntries` table + field; drop the `seriesId` book index; seed entries in `ensureSeeded`.
- `src/lib/series.ts` — `seriesEntries` store; `deriveSeriesProgress` + view types; series/entry mutations; detection helpers.
- `src/lib/books.ts` — `BookInput.entryIds`; map it in `coreFromInput`.
- `src/lib/openlibrary.ts` — `LookupResult.series?`; `parseRosterResponse` + `fetchSeriesRoster`.
- `src/lib/seed.ts` — `seedSeriesEntries`; reshape seed books to `entryIds`.
- `src/lib/components/BookCard.svelte` — remove the `#seriesIndex` badge.
- `src/lib/series.test.ts` — pure unit tests (new).
- `adr/0009-series-volumes-as-entities.md`, `AGENTS.md`, `tasks/0013-series-domain-remodel.md`, `tasks/0004-series-screen.md` — docs.

---

### Task 1: Reshape the data model (types + schema + seed + glue)

The one unavoidable breaking change: swap `seriesId`/`seriesIndex` for `entryIds` and add the `SeriesEntry` entity + table. Everything referencing the old fields is updated in the same task so the app stays green. No new unit tests here; the existing 10 must keep passing.

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db.ts`
- Modify: `src/lib/books.ts:26-52` (`BookInput` + `coreFromInput`)
- Modify: `src/lib/seed.ts`
- Modify: `src/lib/components/BookCard.svelte:42`
- Modify: `src/lib/series.ts` (add the entries store)

**Interfaces:**
- Produces: `SeriesEntry { id: string; seriesId: string; ordinal: number; label: string; title: string }`; `BookCore.entryIds: string[]`; `db.seriesEntries: Table<SeriesEntry, string>`; `seriesEntries` readable store; `seedSeriesEntries: SeriesEntry[]`.

- [ ] **Step 1: Edit `types.ts` — add `SeriesEntry`, reshape `BookCore` and `Series`**

In `src/lib/types.ts`, inside `BookCore`, replace these two lines:

```ts
	seriesId?: string;
	seriesIndex?: number;
```

with:

```ts
	entryIds: string[]; // series volumes this book provides: [] standalone, [x] single, [x,y,z] omnibus
```

Replace the `Series` interface:

```ts
export interface Series {
	id: string;
	name: string;
	author: string;
	totalVolumes: number;
}
```

with:

```ts
export interface Series {
	id: string;
	name: string;
	author: string;
	// "currently available" volume count is derived as the number of SeriesEntry rows
}

/** A canonical volume in a series — edition-agnostic, exists whether or not owned. */
export interface SeriesEntry {
	id: string;
	seriesId: string;
	ordinal: number; // sortable position: 0 (prequel), 1, 2, 3, 3.5 (novella)
	label: string; // display token: "1", "2.5", "Book 0"
	title: string; // canonical title — known even when unowned
}
```

- [ ] **Step 2: Edit `db.ts` — v4 schema, entries table, seed entries**

In `src/lib/db.ts`, add `SeriesEntry` to the type import:

```ts
import type { Book, Loan, Series, Tag, SeriesEntry } from './types';
```

Add the table field to the `HenkaDB` class, after `tags!`:

```ts
	seriesEntries!: Table<SeriesEntry, string>;
```

Add a v4 version block immediately after the existing v3 block (inside the constructor):

```ts
		// v4 — series volumes become first-class entities (ADR 0009). Books link to
		// entries via entryIds; seriesId/seriesIndex removed. Pre-release: clear+reseed.
		this.version(4)
			.stores({
				books: 'id, status, addedAt, finishedAt, isbn',
				series: 'id',
				seriesEntries: 'id, seriesId, ordinal',
				loans: 'id, bookId, returnedAt',
				tags: 'id, kind'
			})
			.upgrade(async (tx) => {
				await tx.table('books').clear();
				await tx.table('series').clear();
				await tx.table('loans').clear();
			});
```

Add `seedSeriesEntries` to the seed import:

```ts
import { seedBooks, seedLoans, seedSeries, seedSeriesEntries, seedTags } from './seed';
```

In `ensureSeeded`, extend the transaction to include the new table and seed it. Replace:

```ts
					await db.transaction('rw', db.books, db.series, db.loans, db.tags, async () => {
						await db.tags.bulkAdd(seedTags);
						await db.books.bulkAdd(seedBooks);
						await db.series.bulkAdd(seedSeries);
						await db.loans.bulkAdd(seedLoans);
					});
```

with:

```ts
					await db.transaction('rw', db.books, db.series, db.seriesEntries, db.loans, db.tags, async () => {
						await db.tags.bulkAdd(seedTags);
						await db.books.bulkAdd(seedBooks);
						await db.series.bulkAdd(seedSeries);
						await db.seriesEntries.bulkAdd(seedSeriesEntries);
						await db.loans.bulkAdd(seedLoans);
					});
```

- [ ] **Step 3: Edit `books.ts` — `BookInput` and `coreFromInput`**

In `src/lib/books.ts`, in the `BookInput` interface, replace:

```ts
	seriesId?: string;
	seriesIndex?: number;
```

with:

```ts
	entryIds?: string[];
```

In `coreFromInput`, replace:

```ts
		seriesId: input.seriesId,
		seriesIndex: input.seriesIndex,
```

with:

```ts
		entryIds: input.entryIds ?? [],
```

- [ ] **Step 4: Edit `series.ts` — add the entries store**

In `src/lib/series.ts`, add the import for the entity type and a store beside the existing `series` store:

```ts
import type { Series, SeriesEntry } from './types';
```

(adjust the existing `import type { Series }` line to include `SeriesEntry`), then add:

```ts
export const seriesEntries = live<SeriesEntry[]>(() => db.seriesEntries.toArray(), []);
```

- [ ] **Step 5: Edit `BookCard.svelte` — remove the seriesIndex badge**

In `src/lib/components/BookCard.svelte`, delete line 42:

```svelte
			{#if book.seriesIndex}<span class="dim">#{book.seriesIndex}</span>{/if}
```

(The per-volume position badge returns with the series screen, task 0004, which has entry context.)

- [ ] **Step 6: Rewrite the series parts of `seed.ts`**

In `src/lib/seed.ts`:

(a) Replace `seedSeries` (drop `totalVolumes`) and add `seedSeriesEntries` right after it:

```ts
export const seedSeries: Series[] = [
	{ id: 'kingkiller', name: 'The Kingkiller Chronicle', author: 'Patrick Rothfuss' },
	{ id: 'earthsea', name: 'Earthsea Cycle', author: 'Ursula K. Le Guin' },
	{ id: 'broken-earth', name: 'The Broken Earth', author: 'N. K. Jemisin' }
];

// Canonical volumes. Some have no owned book (named-missing); one Kingkiller entry is
// a novella (ordinal 2.5); Broken Earth is provided by a single omnibus book.
export const seedSeriesEntries: SeriesEntry[] = [
	// Kingkiller — demonstrates a novella (half ordinal)
	{ id: 'e-kk-1', seriesId: 'kingkiller', ordinal: 1, label: '1', title: 'The Name of the Wind' },
	{ id: 'e-kk-2', seriesId: 'kingkiller', ordinal: 2, label: '2', title: "The Wise Man's Fear" },
	{ id: 'e-kk-25', seriesId: 'kingkiller', ordinal: 2.5, label: '2.5', title: 'The Slow Regard of Silent Things' },
	// Earthsea — demonstrates named-missing (e-es-5) and read-elsewhere (e-es-6)
	{ id: 'e-es-1', seriesId: 'earthsea', ordinal: 1, label: '1', title: 'A Wizard of Earthsea' },
	{ id: 'e-es-2', seriesId: 'earthsea', ordinal: 2, label: '2', title: 'The Tombs of Atuan' },
	{ id: 'e-es-3', seriesId: 'earthsea', ordinal: 3, label: '3', title: 'The Farthest Shore' },
	{ id: 'e-es-4', seriesId: 'earthsea', ordinal: 4, label: '4', title: 'Tehanu' },
	{ id: 'e-es-5', seriesId: 'earthsea', ordinal: 5, label: '5', title: 'Tales from Earthsea' },
	{ id: 'e-es-6', seriesId: 'earthsea', ordinal: 6, label: '6', title: 'The Other Wind' },
	// Broken Earth — provided by one omnibus book
	{ id: 'e-be-1', seriesId: 'broken-earth', ordinal: 1, label: '1', title: 'The Fifth Season' },
	{ id: 'e-be-2', seriesId: 'broken-earth', ordinal: 2, label: '2', title: 'The Obelisk Gate' },
	{ id: 'e-be-3', seriesId: 'broken-earth', ordinal: 3, label: '3', title: 'The Stone Sky' }
];
```

(b) In the `Seed` authoring type, replace:

```ts
	seriesId?: string;
	seriesIndex?: number;
```

with:

```ts
	entryIds?: string[];
```

(c) In `make`, ensure `entryIds` is always set on the built `BookCore`. Change the `base` object so it includes `entryIds`:

```ts
	const base: BookCore = {
		id: crypto.randomUUID(),
		...s,
		currentPage: s.currentPage ?? 0,
		cover: coverFor(s.title),
		addedAt: s.addedAt ?? d(2026, 1, 1),
		entryIds: s.entryIds ?? [],
		tagIds: [...resolve(genres), ...resolve(labels)]
	};
```

(d) Update the Kingkiller seed books — replace `seriesId`/`seriesIndex` with `entryIds`:

- "The Name of the Wind": replace `seriesId: 'kingkiller',` and `seriesIndex: 1,` with `entryIds: ['e-kk-1'],`
- "The Wise Man's Fear": replace `seriesId: 'kingkiller',` and `seriesIndex: 2,` with `entryIds: ['e-kk-2'],`
- "The Slow Regard of Silent Things": replace `seriesId: 'kingkiller',` and `seriesIndex: 3` with `entryIds: ['e-kk-25']`

(e) Update the Earthsea seed books (lines ~216-219) — replace each `seriesId: 'earthsea', seriesIndex: N` with the matching `entryIds`:

- "A Wizard of Earthsea": `entryIds: ['e-es-1'],`
- "The Tombs of Atuan": `entryIds: ['e-es-2'],`
- "The Farthest Shore": `entryIds: ['e-es-3'],`
- "Tehanu": `entryIds: ['e-es-4'],`

Then add a read-at-library Earthsea volume (unowned, not wanted, completed → exercises "missing yet read") in the Earthsea section:

```ts
	{ title: 'The Other Wind', author: 'Ursula K. Le Guin', status: 'completed', pages: 246, currentPage: 246, rating: 4, copies: 0, wanted: false, genres: ['Fantasy'], entryIds: ['e-es-6'], finishedAt: d(2026, 5, 12) },
```

(Entry `e-es-5` "Tales from Earthsea" is intentionally left with no book → a named-missing volume.)

(f) Replace the two Broken Earth books (lines ~222-223) with a single omnibus book:

```ts
	{ title: 'The Broken Earth Trilogy', author: 'N. K. Jemisin', status: 'reading', pages: 1400, currentPage: 900, genres: ['Sci-fi'], format: 'Omnibus', entryIds: ['e-be-1', 'e-be-2', 'e-be-3'], pricePaid: 30, estValue: 33, startedAt: d(2026, 7, 10) },
```

- [ ] **Step 7: Verify green**

Run: `npm run check`
Expected: `0 ERRORS` (warnings unchanged).

Run: `npm test`
Expected: existing tests still pass (10 passed).

Run: `npm run build`
Expected: `✔ done`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: series volumes as entities — reshape data model (schema v4)

Add SeriesEntry entity + table; Book gains entryIds and drops
seriesId/seriesIndex; Series drops totalVolumes. Reshape seed with an
omnibus, a novella, a named-missing volume, and a read-at-library volume.
Pre-release clear+reseed. Part of task 0013 / ADR 0009.

Claude-Session: https://claude.ai/code/session_012mMWEhN4KdsCHZqJjPt3kP"
```

---

### Task 2: `deriveSeriesProgress` + tests

Pure derivation of per-series progress and per-volume slots. TDD.

**Files:**
- Modify: `src/lib/series.ts`
- Test: `src/lib/series.test.ts` (create)

**Interfaces:**
- Consumes: `Series`, `SeriesEntry`, `Book`, `OwnedBook`, `WishedBook` from `types.ts`.
- Produces:
  - `type EntryAcquisition = { kind: 'have'; books: OwnedBook[] } | { kind: 'wanted'; books: WishedBook[] } | { kind: 'missing' }`
  - `interface EntrySlot { entry: SeriesEntry; acquisition: EntryAcquisition; read: boolean; books: Book[] }`
  - `interface SeriesProgress { series: Series; entries: EntrySlot[]; available: number; ownedCount: number; readCount: number; missingCount: number; nextToRead?: EntrySlot; nextToAcquire?: EntrySlot }`
  - `function deriveSeriesProgress(series: Series[], entries: SeriesEntry[], books: Book[]): SeriesProgress[]`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/series.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Book, OwnedBook, WishedBook, Series, SeriesEntry, Status } from './types';
import { deriveSeriesProgress } from './series';

const core = (title: string, over: Partial<Book> = {}) => ({
	id: crypto.randomUUID(),
	title,
	author: 'A',
	pages: 100,
	currentPage: 0,
	entryIds: [] as string[],
	tagIds: [] as string[],
	cover: { from: '#000', to: '#111', ink: '#fff', sub: '#eee' },
	addedAt: 0,
	status: 'to-read' as Status,
	...over
});

const owned = (title: string, entryIds: string[], over: Partial<OwnedBook> = {}): OwnedBook => ({
	...core(title, over),
	entryIds,
	owned: true,
	copies: 1,
	...over
});

const wished = (title: string, entryIds: string[], wanted: boolean, over: Partial<WishedBook> = {}): WishedBook => ({
	...core(title, over),
	entryIds,
	owned: false,
	wanted,
	...over
});

const series: Series[] = [{ id: 's', name: 'S', author: 'A' }];
const entry = (id: string, ordinal: number): SeriesEntry => ({ id, seriesId: 's', ordinal, label: String(ordinal), title: id });

describe('deriveSeriesProgress', () => {
	it('omnibus: one owned book across three entries yields three owned slots', () => {
		const entries = [entry('e1', 1), entry('e2', 2), entry('e3', 3)];
		const books: Book[] = [owned('Omni', ['e1', 'e2', 'e3'])];
		const [p] = deriveSeriesProgress(series, entries, books);
		expect(p.available).toBe(3);
		expect(p.ownedCount).toBe(3);
		expect(p.entries.every((s) => s.acquisition.kind === 'have')).toBe(true);
	});

	it('two editions of one volume count as a single owned slot', () => {
		const entries = [entry('e1', 1)];
		const books: Book[] = [owned('HC', ['e1']), owned('PB', ['e1'])];
		const [p] = deriveSeriesProgress(series, entries, books);
		expect(p.ownedCount).toBe(1);
		expect(p.entries[0].books).toHaveLength(2);
	});

	it('sorts entries by ordinal, placing a novella between integers', () => {
		const entries = [entry('e3', 3), entry('e1', 1), entry('e25', 2.5), entry('e2', 2)];
		const [p] = deriveSeriesProgress(series, entries, []);
		expect(p.entries.map((s) => s.entry.ordinal)).toEqual([1, 2, 2.5, 3]);
	});

	it('read-at-library volume is missing yet read (orthogonal axes)', () => {
		const entries = [entry('e1', 1)];
		const books: Book[] = [wished('Library', ['e1'], false, { status: 'completed' })];
		const [p] = deriveSeriesProgress(series, entries, books);
		expect(p.entries[0].acquisition.kind).toBe('missing');
		expect(p.entries[0].read).toBe(true);
		expect(p.missingCount).toBe(1);
		expect(p.readCount).toBe(1);
	});

	it('wishlisted volume is wanted, not missing', () => {
		const entries = [entry('e1', 1)];
		const [p] = deriveSeriesProgress(series, entries, [wished('Wish', ['e1'], true)]);
		expect(p.entries[0].acquisition.kind).toBe('wanted');
	});

	it('nextToRead is the lowest owned-and-unread; nextToAcquire is the lowest missing', () => {
		const entries = [entry('e1', 1), entry('e2', 2), entry('e3', 3)];
		const books: Book[] = [
			owned('One', ['e1'], { status: 'completed' }),
			owned('Two', ['e2'])
			// e3 has no book
		];
		const [p] = deriveSeriesProgress(series, entries, books);
		expect(p.nextToRead?.entry.id).toBe('e2');
		expect(p.nextToAcquire?.entry.id).toBe('e3');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- series`
Expected: FAIL — `deriveSeriesProgress` is not exported from `./series`.

- [ ] **Step 3: Implement `deriveSeriesProgress`**

In `src/lib/series.ts`, add the imports (extend the existing type import) and the function:

```ts
import type { Series, SeriesEntry, Book, OwnedBook, WishedBook } from './types';

export type EntryAcquisition =
	| { kind: 'have'; books: OwnedBook[] }
	| { kind: 'wanted'; books: WishedBook[] }
	| { kind: 'missing' };

export interface EntrySlot {
	entry: SeriesEntry;
	acquisition: EntryAcquisition;
	read: boolean;
	books: Book[];
}

export interface SeriesProgress {
	series: Series;
	entries: EntrySlot[];
	available: number;
	ownedCount: number;
	readCount: number;
	missingCount: number;
	nextToRead?: EntrySlot;
	nextToAcquire?: EntrySlot;
}

export function deriveSeriesProgress(
	series: Series[],
	entries: SeriesEntry[],
	books: Book[]
): SeriesProgress[] {
	const booksByEntry = new Map<string, Book[]>();
	for (const b of books) {
		for (const eid of b.entryIds) {
			const arr = booksByEntry.get(eid);
			if (arr) arr.push(b);
			else booksByEntry.set(eid, [b]);
		}
	}
	const entriesBySeries = new Map<string, SeriesEntry[]>();
	for (const e of entries) {
		const arr = entriesBySeries.get(e.seriesId);
		if (arr) arr.push(e);
		else entriesBySeries.set(e.seriesId, [e]);
	}

	return series.map((s) => {
		const ordered = (entriesBySeries.get(s.id) ?? []).slice().sort((a, b) => a.ordinal - b.ordinal);
		const slots: EntrySlot[] = ordered.map((entry) => {
			const linked = booksByEntry.get(entry.id) ?? [];
			const ownedBooks = linked.filter((b): b is OwnedBook => b.owned);
			const wishedBooks = linked.filter((b): b is WishedBook => !b.owned && b.wanted);
			const acquisition: EntryAcquisition = ownedBooks.length
				? { kind: 'have', books: ownedBooks }
				: wishedBooks.length
					? { kind: 'wanted', books: wishedBooks }
					: { kind: 'missing' };
			const read = linked.some((b) => b.status === 'completed');
			return { entry, acquisition, read, books: linked };
		});
		return {
			series: s,
			entries: slots,
			available: slots.length,
			ownedCount: slots.filter((x) => x.acquisition.kind === 'have').length,
			readCount: slots.filter((x) => x.read).length,
			missingCount: slots.filter((x) => x.acquisition.kind === 'missing').length,
			nextToRead: slots.find((x) => x.acquisition.kind === 'have' && !x.read),
			nextToAcquire: slots.find((x) => x.acquisition.kind === 'missing')
		};
	});
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- series`
Expected: PASS (6 tests). Then `npm run check` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/series.ts src/lib/series.test.ts
git commit -m "feat: deriveSeriesProgress — per-volume slots (ownership union, reading orthogonal)

Claude-Session: https://claude.ai/code/session_012mMWEhN4KdsCHZqJjPt3kP"
```

---

### Task 3: Series & entry mutations

Thin Dexie mutations for creating/editing series, entries, and book links. Kept thin and verified by `check`/`build` (no IndexedDB test harness — see Global Constraints).

**Files:**
- Modify: `src/lib/series.ts`

**Interfaces:**
- Consumes: `db` from `db.ts`; `SeriesEntry` from `types.ts`.
- Produces:
  - `createSeries(name: string, author: string): Promise<string>`
  - `ensureSeries(name: string, author: string): Promise<string>`
  - `addEntry(seriesId: string, e: { ordinal: number; title: string; label?: string }): Promise<string>`
  - `ensureEntry(seriesId: string, ordinal: number, title: string): Promise<string>`
  - `editEntry(id: string, patch: Partial<Pick<SeriesEntry, 'ordinal' | 'title' | 'label'>>): Promise<void>`
  - `removeEntry(id: string): Promise<void>`
  - `deleteSeries(seriesId: string): Promise<void>`
  - `setBookEntries(bookId: string, entryIds: string[]): Promise<void>`

- [ ] **Step 1: Implement the mutations**

Append to `src/lib/series.ts`:

```ts
// ── Mutations ─────────────────────────────────────────────────────────
export async function createSeries(name: string, author: string): Promise<string> {
	const id = crypto.randomUUID();
	await db.series.add({ id, name: name.trim(), author: author.trim() });
	return id;
}

/** Find a series by name+author (case-insensitive), or create it. Mirrors ensureTag. */
export async function ensureSeries(name: string, author: string): Promise<string> {
	const n = name.trim().toLowerCase();
	const a = author.trim().toLowerCase();
	const existing = (await db.series.toArray()).find(
		(s) => s.name.toLowerCase() === n && s.author.toLowerCase() === a
	);
	return existing ? existing.id : createSeries(name, author);
}

async function entryByOrdinal(seriesId: string, ordinal: number): Promise<SeriesEntry | undefined> {
	return db.seriesEntries
		.where('seriesId')
		.equals(seriesId)
		.filter((e) => e.ordinal === ordinal)
		.first();
}

export async function addEntry(
	seriesId: string,
	e: { ordinal: number; title: string; label?: string }
): Promise<string> {
	if (await entryByOrdinal(seriesId, e.ordinal)) {
		throw new Error(`Series ${seriesId} already has a volume at ordinal ${e.ordinal}`);
	}
	const id = crypto.randomUUID();
	await db.seriesEntries.add({
		id,
		seriesId,
		ordinal: e.ordinal,
		title: e.title.trim(),
		label: e.label ?? String(e.ordinal)
	});
	return id;
}

/** Find an entry by ordinal within a series, or create it. Idempotent. */
export async function ensureEntry(seriesId: string, ordinal: number, title: string): Promise<string> {
	const existing = await entryByOrdinal(seriesId, ordinal);
	return existing ? existing.id : addEntry(seriesId, { ordinal, title });
}

export async function editEntry(
	id: string,
	patch: Partial<Pick<SeriesEntry, 'ordinal' | 'title' | 'label'>>
): Promise<void> {
	await db.seriesEntries.update(id, patch);
}

export async function removeEntry(id: string): Promise<void> {
	await db.transaction('rw', db.seriesEntries, db.books, async () => {
		await db.seriesEntries.delete(id);
		const affected = await db.books.filter((b) => b.entryIds.includes(id)).toArray();
		await Promise.all(
			affected.map((b) => db.books.update(b.id, { entryIds: b.entryIds.filter((e) => e !== id) }))
		);
	});
}

export async function deleteSeries(seriesId: string): Promise<void> {
	await db.transaction('rw', db.series, db.seriesEntries, db.books, async () => {
		const entries = await db.seriesEntries.where('seriesId').equals(seriesId).toArray();
		const ids = new Set(entries.map((e) => e.id));
		await db.seriesEntries.where('seriesId').equals(seriesId).delete();
		await db.series.delete(seriesId);
		const affected = await db.books.filter((b) => b.entryIds.some((e) => ids.has(e))).toArray();
		await Promise.all(
			affected.map((b) => db.books.update(b.id, { entryIds: b.entryIds.filter((e) => !ids.has(e)) }))
		);
	});
}

/** Set which entries a book provides. Validates entries exist and share one series. */
export async function setBookEntries(bookId: string, entryIds: string[]): Promise<void> {
	const found = await db.seriesEntries.bulkGet(entryIds);
	if (found.some((e) => !e)) throw new Error('setBookEntries: unknown entry id');
	const seriesIds = new Set(found.map((e) => e!.seriesId));
	if (seriesIds.size > 1) throw new Error('setBookEntries: entries span multiple series');
	await db.books.update(bookId, { entryIds: [...entryIds] });
}
```

- [ ] **Step 2: Verify green**

Run: `npm run check` → 0 errors.
Run: `npm run build` → `✔ done`.
Run: `npm test` → all pass (unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/lib/series.ts
git commit -m "feat: series & entry mutations (create/ensure/add/edit/remove/link)

Claude-Session: https://claude.ai/code/session_012mMWEhN4KdsCHZqJjPt3kP"
```

---

### Task 4: Detection helpers (`parseSeriesHint`, `matchLocalSeries`, `detectSeriesCandidates`)

Pure functions driving the two population flows: add-time local matching, and library/single-book discovery grouping. TDD.

**Files:**
- Modify: `src/lib/series.ts`
- Test: `src/lib/series.test.ts`

**Interfaces:**
- Consumes: `Series`, `SeriesEntry`, `Book` from `types.ts`.
- Produces:
  - `function parseSeriesHint(raw: string): { name: string; ordinal?: number }`
  - `type LocalMatch = { kind: 'entry'; entry: SeriesEntry } | { kind: 'series'; series: Series }`
  - `function matchLocalSeries(book: { title: string; author: string }, series: Series[], entries: SeriesEntry[]): LocalMatch | null`
  - `interface SeriesCandidate { name: string; author: string; members: { book: Book; ordinal?: number }[]; roster: { ordinal: number; title: string }[] }`
  - `function detectSeriesCandidates(books: Book[], hints: Map<string, { series?: string }>): SeriesCandidate[]`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/series.test.ts`:

```ts
import {
	parseSeriesHint,
	matchLocalSeries,
	detectSeriesCandidates,
	type SeriesCandidate
} from './series';

describe('parseSeriesHint', () => {
	it('parses "Name #N"', () => {
		expect(parseSeriesHint('The Kingkiller Chronicle #1')).toEqual({
			name: 'The Kingkiller Chronicle',
			ordinal: 1
		});
	});
	it('parses "Name (N)"', () => {
		expect(parseSeriesHint('Earthsea (2)')).toEqual({ name: 'Earthsea', ordinal: 2 });
	});
	it('parses "Name, Book N" and half ordinals', () => {
		expect(parseSeriesHint('Broken Earth, Book 2')).toEqual({ name: 'Broken Earth', ordinal: 2 });
		expect(parseSeriesHint('Kingkiller #2.5')).toEqual({ name: 'Kingkiller', ordinal: 2.5 });
	});
	it('returns just the name when there is no number', () => {
		expect(parseSeriesHint('Standalone Saga')).toEqual({ name: 'Standalone Saga' });
	});
});

describe('matchLocalSeries', () => {
	const series: Series[] = [{ id: 's', name: 'Earthsea', author: 'Ursula K. Le Guin' }];
	const entries: SeriesEntry[] = [
		{ id: 'e5', seriesId: 's', ordinal: 5, label: '5', title: 'Tales from Earthsea' }
	];

	it('matches a book title to a named-missing entry', () => {
		const m = matchLocalSeries({ title: 'Tales from Earthsea', author: 'Ursula K. Le Guin' }, series, entries);
		expect(m).toEqual({ kind: 'entry', entry: entries[0] });
	});
	it('falls back to author→series when no title matches', () => {
		const m = matchLocalSeries({ title: 'The Other Wind', author: 'Ursula K. Le Guin' }, series, entries);
		expect(m).toEqual({ kind: 'series', series: series[0] });
	});
	it('returns null when nothing local matches (never fabricates a series)', () => {
		const m = matchLocalSeries({ title: 'Dune', author: 'Frank Herbert' }, series, entries);
		expect(m).toBeNull();
	});
});

describe('detectSeriesCandidates', () => {
	const mk = (id: string, title: string, author: string): Book => ({
		id,
		title,
		author,
		pages: 1,
		currentPage: 0,
		entryIds: [],
		tagIds: [],
		cover: { from: '#000', to: '#111', ink: '#fff', sub: '#eee' },
		addedAt: 0,
		status: 'to-read',
		owned: true,
		copies: 1
	});

	it('groups books sharing a series hint into one candidate', () => {
		const books = [mk('b1', 'A Wizard of Earthsea', 'UKL'), mk('b2', 'The Tombs of Atuan', 'UKL')];
		const hints = new Map([
			['b1', { series: 'Earthsea (1)' }],
			['b2', { series: 'Earthsea (2)' }]
		]);
		const out: SeriesCandidate[] = detectSeriesCandidates(books, hints);
		expect(out).toHaveLength(1);
		expect(out[0].name).toBe('Earthsea');
		expect(out[0].members.map((m) => m.ordinal)).toEqual([1, 2]);
	});

	it('ignores books with no hint', () => {
		const books = [mk('b1', 'Dune', 'FH')];
		expect(detectSeriesCandidates(books, new Map())).toEqual([]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- series`
Expected: FAIL — `parseSeriesHint`/`matchLocalSeries`/`detectSeriesCandidates` not exported.

- [ ] **Step 3: Implement the detection helpers**

Append to `src/lib/series.ts` (add `Book` to the type import if not already present from Task 2 — it is):

```ts
// ── Detection ─────────────────────────────────────────────────────────
/** Parse a metadata series string like "Name #1", "Name (1)", "Name, Book 2". */
export function parseSeriesHint(raw: string): { name: string; ordinal?: number } {
	const m = raw.match(/^(.*?)[\s,]*(?:#|\(|book\s+|vol\.?\s*|no\.?\s*)\s*(\d+(?:\.\d+)?)\)?\s*$/i);
	if (m) return { name: m[1].trim(), ordinal: Number(m[2]) };
	return { name: raw.trim() };
}

export type LocalMatch =
	| { kind: 'entry'; entry: SeriesEntry }
	| { kind: 'series'; series: Series };

/**
 * Match a book against series that already exist locally — never the network,
 * never creating a series. title→entry (fills a named-missing slot) wins over
 * author→series (extend an existing roster).
 */
export function matchLocalSeries(
	book: { title: string; author: string },
	series: Series[],
	entries: SeriesEntry[]
): LocalMatch | null {
	const title = book.title.trim().toLowerCase();
	const entry = entries.find((e) => e.title.trim().toLowerCase() === title);
	if (entry) return { kind: 'entry', entry };
	const author = book.author.trim().toLowerCase();
	const s = series.find((x) => x.author.trim().toLowerCase() === author);
	if (s) return { kind: 'series', series: s };
	return null;
}

export interface SeriesCandidate {
	name: string;
	author: string;
	members: { book: Book; ordinal?: number }[];
	roster: { ordinal: number; title: string }[];
}

/**
 * Group candidate books by the series named in their external hints. The roster
 * is filled separately by fetchSeriesRoster; here it starts empty.
 */
export function detectSeriesCandidates(
	books: Book[],
	hints: Map<string, { series?: string }>
): SeriesCandidate[] {
	const byName = new Map<string, SeriesCandidate>();
	for (const b of books) {
		const raw = hints.get(b.id)?.series;
		if (!raw) continue;
		const { name, ordinal } = parseSeriesHint(raw);
		const key = name.toLowerCase();
		let c = byName.get(key);
		if (!c) {
			c = { name, author: b.author, members: [], roster: [] };
			byName.set(key, c);
		}
		c.members.push({ book: b, ordinal });
	}
	return [...byName.values()];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- series`
Expected: PASS (all `series.test.ts` tests). Then `npm run check` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/series.ts src/lib/series.test.ts
git commit -m "feat: series detection helpers (parseSeriesHint, matchLocalSeries, detectSeriesCandidates)

Claude-Session: https://claude.ai/code/session_012mMWEhN4KdsCHZqJjPt3kP"
```

---

### Task 5: External roster lookup (`parseRosterResponse` + `fetchSeriesRoster`)

Best-effort roster collection from Open Library. The parse is pure and tested; the fetch wrapper is thin (matches the untested I/O style already in `openlibrary.ts`). Also surface Open Library's `series` field on lookups so the flows can build hints.

**Files:**
- Modify: `src/lib/openlibrary.ts`
- Test: `src/lib/openlibrary.test.ts` (create)

**Interfaces:**
- Produces:
  - `interface RosterVolume { ordinal: number; title: string }`
  - `function parseRosterResponse(json: unknown): RosterVolume[]`
  - `function fetchSeriesRoster(name: string, signal?: AbortSignal): Promise<RosterVolume[]>`
  - `LookupResult.series?: string` (new optional field)

- [ ] **Step 1: Write the failing test for the pure parser**

Create `src/lib/openlibrary.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseRosterResponse } from './openlibrary';

describe('parseRosterResponse', () => {
	it('extracts ordinal+title from search docs and sorts by ordinal', () => {
		const json = {
			docs: [
				{ title: 'The Tombs of Atuan', series: ['Earthsea #2'] },
				{ title: 'A Wizard of Earthsea', series: ['Earthsea #1'] }
			]
		};
		expect(parseRosterResponse(json)).toEqual([
			{ ordinal: 1, title: 'A Wizard of Earthsea' },
			{ ordinal: 2, title: 'The Tombs of Atuan' }
		]);
	});

	it('drops docs with no parseable ordinal and dedupes by ordinal', () => {
		const json = {
			docs: [
				{ title: 'Companion', series: ['Earthsea'] }, // no ordinal → dropped
				{ title: 'A Wizard of Earthsea', series: ['Earthsea #1'] },
				{ title: 'A Wizard of Earthsea (reissue)', series: ['Earthsea #1'] } // dup ordinal → dropped
			]
		};
		expect(parseRosterResponse(json)).toEqual([{ ordinal: 1, title: 'A Wizard of Earthsea' }]);
	});

	it('returns [] for a malformed response', () => {
		expect(parseRosterResponse(null)).toEqual([]);
		expect(parseRosterResponse({})).toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- openlibrary`
Expected: FAIL — `parseRosterResponse` not exported.

- [ ] **Step 3: Implement parser, fetch wrapper, and the `series` field**

In `src/lib/openlibrary.ts`:

Add `series` to `LookupResult`:

```ts
export interface LookupResult {
	title: string;
	author: string;
	pages?: number;
	year?: number;
	publisher?: string;
	isbn?: string;
	genre?: string;
	coverImage?: string;
	series?: string; // raw Open Library series string, e.g. "Earthsea #1" (often absent)
}
```

In `lookupIsbn`, add to the returned object (Open Library `data` records expose `series` inconsistently):

```ts
		series: Array.isArray(rec.series) ? rec.series[0]?.name ?? rec.series[0] : rec.series,
```

At the end of the file, add the roster parser and fetcher:

```ts
export interface RosterVolume {
	ordinal: number;
	title: string;
}

// Local copy of the hint pattern (kept here to avoid a series.ts → openlibrary.ts import).
function ordinalFromSeries(raw: string): number | undefined {
	const m = raw.match(/(?:#|\(|book\s+|vol\.?\s*|no\.?\s*)\s*(\d+(?:\.\d+)?)/i);
	return m ? Number(m[1]) : undefined;
}

/** Pure: turn an Open Library search response into a sorted, deduped roster. */
export function parseRosterResponse(json: unknown): RosterVolume[] {
	const docs = (json as { docs?: unknown[] })?.docs;
	if (!Array.isArray(docs)) return [];
	const byOrdinal = new Map<number, RosterVolume>();
	for (const d of docs) {
		const doc = d as { title?: string; series?: unknown };
		const seriesStr = Array.isArray(doc.series) ? String(doc.series[0]) : undefined;
		const ordinal = seriesStr ? ordinalFromSeries(seriesStr) : undefined;
		if (ordinal == null || !doc.title) continue;
		if (!byOrdinal.has(ordinal)) byOrdinal.set(ordinal, { ordinal, title: doc.title });
	}
	return [...byOrdinal.values()].sort((a, b) => a.ordinal - b.ordinal);
}

/**
 * Best-effort: fetch the volumes of a series by name. Open Library's series data is
 * sparse and inconsistent, so callers must let the user fix/fill the result by hand.
 */
export async function fetchSeriesRoster(name: string, signal?: AbortSignal): Promise<RosterVolume[]> {
	const q = name.trim();
	if (!q) return [];
	const url =
		`https://openlibrary.org/search.json?q=${encodeURIComponent(`series:"${q}"`)}` +
		`&fields=title,series&limit=40`;
	const res = await fetch(url, { signal });
	if (!res.ok) return [];
	return parseRosterResponse(await res.json());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- openlibrary`
Expected: PASS (3 tests). Then `npm run check` → 0 errors and `npm run build` → `✔ done`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openlibrary.ts src/lib/openlibrary.test.ts
git commit -m "feat: best-effort series roster lookup + series hint on Open Library results

Claude-Session: https://claude.ai/code/session_012mMWEhN4KdsCHZqJjPt3kP"
```

---

### Task 6: ADR 0009, AGENTS.md, task files

Record the decision and update project docs so a future session finds the new model.

**Files:**
- Create: `adr/0009-series-volumes-as-entities.md`
- Modify: `AGENTS.md`
- Create: `tasks/0013-series-domain-remodel.md`
- Modify: `tasks/0004-series-screen.md`

- [ ] **Step 1: Write ADR 0009**

Create `adr/0009-series-volumes-as-entities.md` (match the style of `adr/0008-...md` — read it first for heading/format). Content must cover:

- **Context:** the thin `Series { totalVolumes }` + `seriesId`/`seriesIndex`-on-book model can't represent named-missing volumes, novellas/half-numbers, omnibus, or multiple editions.
- **Decision:** volumes are first-class edition-agnostic `SeriesEntry` rows; books link many-to-many via `entryIds`; `Series` loses `totalVolumes` (derived as `entries.length`); ISBN stays on the book (ADR 0006); reading stays orthogonal (ADR 0008); series knowledge enters two ways — add-time **local** matching and explicit **external** discovery (library-wide or single-book).
- **Consequences:** new `seriesEntries` table (schema v4, clear+reseed pre-release); `series.ts` owns the derivation + mutations + detection; external roster data is best-effort so the discovery UI must allow manual fix/fill; add-time never creates a series.
- **References:** ADR 0005 (tags as entities), 0006 (isbn as attribute), 0008 (ownership union / reading orthogonal).

- [ ] **Step 2: Update AGENTS.md**

In `AGENTS.md`:

(a) In the Layout section, update the `types.ts` and `series.ts` descriptions to mention `SeriesEntry` and that `series.ts` holds `deriveSeriesProgress` + series/entry mutations + detection helpers.

(b) In the Data model section, add a bullet: series volumes are `SeriesEntry` entities (edition-agnostic); books link many-to-many via `entryIds` (omnibus = one book→many entries; editions = many books→one entry); "available" = entry count; see ADR 0009.

- [ ] **Step 3: Create task 0013 and update task 0004**

Create `tasks/0013-series-domain-remodel.md` with frontmatter (`id: 0013`, `title: Series domain remodel (volumes as entities)`, `state: done` once the code tasks above are merged, `module: lib/series + lib/types + lib/db`, `depends_on: [0012]`, dates 2026-07-23). Body: link the spec (`docs/superpowers/specs/2026-07-23-series-domain-design.md`), ADR 0009, and note the verification (check/test/build green, new pure tests).

In `tasks/0004-series-screen.md`, update the `## Context / where it lives` section: the domain now exposes `deriveSeriesProgress`, `seriesEntries` store, series/entry mutations, and detection helpers in `series.ts`; the screen consumes them and owns the discovery **review UI** (both library-wide and single-book triggers) and the add-time series section. Add `depends_on: [0013]` to its frontmatter.

- [ ] **Step 4: Verify**

Run: `npm run check` → 0 errors (docs don't affect it, but confirm nothing regressed).

- [ ] **Step 5: Commit**

```bash
git add adr/0009-series-volumes-as-entities.md AGENTS.md tasks/0013-series-domain-remodel.md tasks/0004-series-screen.md
git commit -m "docs: ADR 0009 + AGENTS/task updates for series volume entities

Claude-Session: https://claude.ai/code/session_012mMWEhN4KdsCHZqJjPt3kP"
```

---

## Done criteria

- `npm run check` → 0 errors; `npm test` → all pass (ownership + series + openlibrary suites); `npm run build` → completes.
- `db.ts` holds only shared infra; `series.ts` owns derivation, mutations, and detection; `books.ts` does not import `series.ts`.
- Seed exercises every derived state (omnibus, novella, named-missing, read-at-library) on first run.
- ADR 0009 recorded; AGENTS.md and tasks updated.
- The `/series` screen (task 0004) and the discovery review UI remain out of scope — this plan delivers the domain they build on.
