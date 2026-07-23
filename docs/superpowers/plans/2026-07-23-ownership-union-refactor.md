# Ownership Union Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `Book` (where `copies === 0` means wishlist and `status` is always present) with a discriminated union on `owned`, keeping reading fields common — so illegal states (`copies: 0`, "owned + wished", status gated by ownership) become unrepresentable. Implements ADR 0008 / task 0011.

**Architecture:** `Book = OwnedBook | WishedBook`, both extending `BookCore` (work + reading fields). Variant transitions are **pure functions** in a new `src/lib/ownership.ts` (unit-tested), called by thin Dexie mutations that `put()` a rebuilt row (never `update()`, so stale fields from the other variant can't linger). All consumers narrow on `book.owned`.

**Tech Stack:** SvelteKit 5 (runes), TypeScript 6 (classic), Dexie (IndexedDB), Vitest (new — pure-logic unit tests only).

## Global Constraints

- `npm run check` MUST end at **0 errors** (the ~17 "captures the initial value" form warnings are expected and unchanged).
- `npm run build` MUST pass (adapter-static SPA).
- All user-facing strings go through `t()`; add the key to `src/lib/i18n/locales/en.ts` **first** (it types `MessageKey`), then `src/lib/i18n/locales/sk.ts`.
- **Pre-release, no migrations:** bump the Dexie version and let `ensureSeeded()` reseed. Do NOT write `.upgrade()` data-preservation logic.
- `owned` is a boolean discriminant — **stored but NOT a Dexie index** (IndexedDB keys can't be booleans).
- Icons via `lucide-svelte/icons/<name>`, `strokeWidth={2.4}`.
- Commit trailer on every commit: `Claude-Session: https://claude.ai/code/session_01PW3L8es9LPSRwmbduaCuws`.

---

### Task 1: Vitest test harness

**Files:**
- Modify: `package.json` (devDependency + `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/ownership.test.ts` (smoke test only, expanded in Task 2)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` (one-shot) and `npm run test:watch` run Vitest over `src/**/*.test.ts`. No app source touched, so behavior is unchanged.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^3`
Expected: `vitest` added under devDependencies; `package-lock.json` updated.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
```

- [ ] **Step 4: Create a smoke test at `src/lib/ownership.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
	it('runs', () => {
		expect(1 + 1).toBe(2);
	});
});
```

- [ ] **Step 5: Run the suite**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Confirm the app is unaffected**

Run: `npm run check`
Expected: `0 ERRORS` (17 warnings).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/ownership.test.ts
git commit -m "chore: add Vitest for pure-logic unit tests

Harness only — no app source touched. Enables TDD of the ownership
transition logic in the model refactor (task 0011).

Claude-Session: https://claude.ai/code/session_01PW3L8es9LPSRwmbduaCuws"
```

---

### Task 2: Ownership discriminated union + full migration

This is **one atomic commit**: swapping the core `Book` type breaks every consumer at once, so `svelte-check` cannot stay green mid-task. The commit both starts and ends with the app functioning. Steps 1–6 TDD the pure transition logic first (it compiles independently once the types exist); steps 7+ wire it through and fix all consumers before the single commit at the end.

**Files:**
- Modify: `src/lib/types.ts` (the union + guards)
- Create/overwrite: `src/lib/ownership.test.ts` (real tests)
- Create: `src/lib/ownership.ts` (pure transitions)
- Modify: `src/lib/db.ts` (schema v3 + variant-aware mutations)
- Modify: `src/lib/seed.ts` (owned/wished variants + one read-elsewhere example)
- Modify: `src/lib/components/BookForm.svelte`
- Modify: `src/lib/components/AddBookModal.svelte`
- Modify: `src/routes/book/[id]/+page.svelte`
- Modify: `src/lib/components/BookCard.svelte`
- Modify: `src/routes/+page.svelte` (shelf)
- Modify: `src/lib/stats.ts`
- Modify: `src/lib/i18n/locales/en.ts` and `.../sk.ts`
- Modify: `AGENTS.md` (data-model section)

**Interfaces:**
- Produces (types.ts):
  ```ts
  interface BookCore { id; title; author; pages; isbn?; year?; publisher?;
    seriesId?; seriesIndex?; tagIds: string[]; notes?; cover: Cover;
    coverImage?; addedAt: number;
    status: Status; currentPage: number; startedAt?; finishedAt?; rating?; }
  interface OwnedBook  extends BookCore { owned: true;  copies: number; format?; pricePaid?; estValue?; }
  interface WishedBook extends BookCore { owned: false; wanted: boolean; estValue?; }
  type Book = OwnedBook | WishedBook;
  const isOwned:    (b: Book) => b is OwnedBook;
  const isWishlist: (b: Book) => boolean;   // !owned && wanted
  ```
- Produces (ownership.ts):
  ```ts
  withCopies(b: Book, n: number): Book;   // n>=1 => owned copies n; n<=0 => unowned {wanted:false}
  acquired(b: Book): OwnedBook;           // +1 copy, or acquire (→1) when unowned
  withWanted(b: Book, wanted: boolean): Book; // toggles on unowned; owned unchanged
  ```
- Produces (db.ts):
  ```ts
  interface BookInput { title; author; pages; status: Status; currentPage?; copies: number;
    isbn?; year?; publisher?; format?; pricePaid?; estValue?; tagIds?; coverImage?;
    seriesId?; seriesIndex?; rating?; notes?; }
  addBook(input: BookInput): Promise<string>;
  saveBookEdits(id: string, input: BookInput): Promise<void>;
  setCopies(id: string, n: number): Promise<void>;
  addCopy(id: string): Promise<void>;
  setWanted(id: string, wanted: boolean): Promise<void>;
  updateBook(id: string, patch: Partial<BookCore>): Promise<void>;
  ```

- [ ] **Step 1: Rewrite `src/lib/types.ts`**

Replace the `Status`/`Book`/`isOwned`/`isWishlist`/`READING_STATUSES` region with:

```ts
export type Status = 'reading' | 'to-read' | 'completed' | 'wont-read';
export const READING_STATUSES: Status[] = ['reading', 'to-read', 'completed', 'wont-read'];

export interface Cover {
	from: string;
	to: string;
	ink: string;
	sub: string;
}

export type TagKind = 'genre' | 'label';
export interface Tag {
	id: string;
	name: string;
	kind: TagKind;
}

/** Fields intrinsic to the work + the reading axis — present on every book,
 *  independent of ownership (you can read a book you don't own). */
export interface BookCore {
	id: string;
	title: string;
	author: string;
	pages: number;
	isbn?: string;
	year?: number;
	publisher?: string;
	seriesId?: string;
	seriesIndex?: number;
	tagIds: string[];
	notes?: string;
	cover: Cover;
	coverImage?: string;
	addedAt: number;
	// reading axis
	status: Status;
	currentPage: number;
	startedAt?: number;
	finishedAt?: number;
	rating?: number;
}

export interface OwnedBook extends BookCore {
	owned: true;
	copies: number; // always >= 1
	format?: string;
	pricePaid?: number;
	estValue?: number;
}

export interface WishedBook extends BookCore {
	owned: false;
	wanted: boolean; // true => wishlist item
	estValue?: number;
}

export type Book = OwnedBook | WishedBook;

export const isOwned = (b: Book): b is OwnedBook => b.owned;
export const isWishlist = (b: Book): boolean => !b.owned && b.wanted;
```

Keep the existing `Series` and `Loan` interfaces unchanged.

- [ ] **Step 2: Write the failing transition tests — overwrite `src/lib/ownership.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { Book, OwnedBook, WishedBook } from './types';
import { withCopies, acquired, withWanted } from './ownership';

const owned = (over: Partial<OwnedBook> = {}): OwnedBook => ({
	id: 'b1', title: 'T', author: 'A', pages: 300, tagIds: [],
	cover: { from: '#000', to: '#111', ink: '#fff', sub: '#ccc' }, addedAt: 1,
	status: 'completed', currentPage: 300, finishedAt: 999,
	owned: true, copies: 1, format: 'Hardcover', pricePaid: 20, estValue: 18, ...over
});
const wished = (over: Partial<WishedBook> = {}): WishedBook => ({
	id: 'b2', title: 'W', author: 'A', pages: 200, tagIds: [],
	cover: { from: '#000', to: '#111', ink: '#fff', sub: '#ccc' }, addedAt: 1,
	status: 'to-read', currentPage: 0,
	owned: false, wanted: true, estValue: 15, ...over
});

describe('withCopies', () => {
	it('owned → unowned(not wanted) when set to 0, preserving reading', () => {
		const r = withCopies(owned(), 0);
		expect(r.owned).toBe(false);
		if (r.owned) throw new Error('narrowing');
		expect(r.wanted).toBe(false);
		expect(r.status).toBe('completed');
		expect(r.currentPage).toBe(300);
		expect(r.finishedAt).toBe(999);
		expect(r.estValue).toBe(18);
		expect('copies' in r).toBe(false);
		expect('format' in r).toBe(false);
		expect('pricePaid' in r).toBe(false);
	});
	it('unowned → owned when set to >=1, dropping wanted, preserving reading', () => {
		const r = withCopies(wished({ status: 'reading', currentPage: 10 }), 2);
		expect(r.owned).toBe(true);
		if (!r.owned) throw new Error('narrowing');
		expect(r.copies).toBe(2);
		expect(r.status).toBe('reading');
		expect(r.currentPage).toBe(10);
		expect(r.estValue).toBe(15);
		expect('wanted' in r).toBe(false);
	});
	it('owned → owned keeps owned-only fields', () => {
		const r = withCopies(owned(), 3);
		expect(r.owned && r.copies).toBe(3);
		expect(r.owned && r.format).toBe('Hardcover');
		expect(r.owned && r.pricePaid).toBe(20);
	});
});

describe('acquired', () => {
	it('increments an owned book', () => {
		expect(acquired(owned({ copies: 2 })).copies).toBe(3);
	});
	it('acquires an unowned book to 1 copy, preserving reading', () => {
		const r = acquired(wished({ status: 'completed', currentPage: 200 }));
		expect(r.owned).toBe(true);
		expect(r.copies).toBe(1);
		expect(r.status).toBe('completed');
		expect(r.currentPage).toBe(200);
		expect('wanted' in r).toBe(false);
	});
});

describe('withWanted', () => {
	it('toggles wanted on an unowned book', () => {
		expect((withWanted(wished({ wanted: true }), false) as WishedBook).wanted).toBe(false);
	});
	it('leaves an owned book unchanged', () => {
		const b = owned();
		expect(withWanted(b, true)).toBe(b);
	});
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./ownership` (module not created yet).

- [ ] **Step 4: Implement `src/lib/ownership.ts`**

```ts
import type { Book, BookCore, OwnedBook } from './types';

/** Reduce either variant to just its shared BookCore (strips variant-only keys). */
function core(b: Book): BookCore {
	const { owned, ...rest } = b as OwnedBook & { wanted?: boolean };
	const { copies, format, pricePaid, wanted, estValue, ...c } = rest as OwnedBook & {
		wanted?: boolean;
	};
	return c;
}

/**
 * Set the owned copy count. `n >= 1` → owned with that many copies; `n <= 0` →
 * unowned and NOT wanted (you no longer hold it, but losing a copy doesn't mean
 * you wish for it). Reading fields are always preserved. estValue carries over.
 */
export function withCopies(b: Book, n: number): Book {
	const count = Math.floor(n);
	if (count >= 1) {
		return {
			...core(b),
			owned: true,
			copies: count,
			format: b.owned ? b.format : undefined,
			pricePaid: b.owned ? b.pricePaid : undefined,
			estValue: b.estValue
		};
	}
	return { ...core(b), owned: false, wanted: false, estValue: b.estValue };
}

/** Add a copy: increment an owned book, or acquire an unowned one (→ 1 copy). */
export function acquired(b: Book): OwnedBook {
	if (b.owned) return { ...b, copies: b.copies + 1 };
	return { ...core(b), owned: true, copies: 1, estValue: b.estValue };
}

/** Toggle wishlist desire on an unowned book; owned books are returned unchanged. */
export function withWanted(b: Book, wanted: boolean): Book {
	if (b.owned) return b;
	return { ...b, wanted };
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npm test`
Expected: PASS — all `withCopies` / `acquired` / `withWanted` tests green.

- [ ] **Step 6: Rewrite mutations in `src/lib/db.ts`**

(a) Update imports at the top:

```ts
import type { Book, BookCore, Loan, Series, Status, Tag, TagKind } from './types';
import { withCopies, acquired, withWanted } from './ownership';
```

(b) Bump the Dexie schema to v3 (add after the `.version(2)` block, before the closing `}` of the constructor). Indexes are unchanged (`owned` is not indexable); the upgrade clears rows so `ensureSeeded()` repopulates:

```ts
// v3 — ownership becomes a discriminated union (ADR 0008). Pre-release: clear
// and reseed rather than migrate. `owned` is stored but not indexed (booleans
// aren't valid IndexedDB keys).
this.version(3)
	.stores({
		books: 'id, status, seriesId, addedAt, finishedAt, isbn',
		series: 'id',
		loans: 'id, bookId, returnedAt',
		tags: 'id, kind'
	})
	.upgrade(async (tx) => {
		await tx.table('books').clear();
		await tx.table('series').clear();
		await tx.table('loans').clear();
	});
```

(c) Replace `addBook` and add `BookInput` + `saveBookEdits`:

```ts
export interface BookInput {
	title: string;
	author: string;
	pages: number;
	status: Status;
	currentPage?: number;
	copies: number; // >= 1 owned; 0 => wishlist (wanted)
	isbn?: string;
	year?: number;
	publisher?: string;
	format?: string;
	pricePaid?: number;
	estValue?: number;
	tagIds?: string[];
	coverImage?: string;
	seriesId?: string;
	seriesIndex?: number;
	rating?: number;
	notes?: string;
}

function coreFromInput(input: BookInput, base: Pick<BookCore, 'id' | 'cover' | 'addedAt'>): BookCore {
	return {
		...base,
		title: input.title,
		author: input.author,
		pages: input.pages,
		status: input.status,
		currentPage: input.currentPage ?? 0,
		tagIds: input.tagIds ?? [],
		coverImage: input.coverImage,
		isbn: normalizeIsbn(input.isbn) ?? undefined,
		year: input.year,
		publisher: input.publisher,
		seriesId: input.seriesId,
		seriesIndex: input.seriesIndex,
		rating: input.rating,
		notes: input.notes
	};
}

function buildBook(coreFields: BookCore, copies: number, input: BookInput): Book {
	return copies >= 1
		? { ...coreFields, owned: true, copies, format: input.format, pricePaid: input.pricePaid, estValue: input.estValue }
		: { ...coreFields, owned: false, wanted: true, estValue: input.estValue };
}

export async function addBook(input: BookInput): Promise<string> {
	const copies = Math.max(0, Math.floor(input.copies));
	const coreFields = coreFromInput(input, {
		id: crypto.randomUUID(),
		cover: coverFor(input.title),
		addedAt: Date.now()
	});
	const book = buildBook(coreFields, copies, input);
	await db.books.add(book);
	return book.id;
}

/** Save edits from the book form. Rebuilds the ownership variant from
 *  input.copies while preserving reading progress not exposed by the form
 *  (currentPage, startedAt, finishedAt, rating). */
export async function saveBookEdits(id: string, input: BookInput): Promise<void> {
	const existing = await db.books.get(id);
	if (!existing) return;
	const copies = Math.max(0, Math.floor(input.copies));
	const coreFields: BookCore = {
		...coreFromInput(input, { id: existing.id, cover: existing.cover, addedAt: existing.addedAt }),
		currentPage: existing.currentPage,
		startedAt: existing.startedAt,
		finishedAt: existing.finishedAt,
		rating: existing.rating
	};
	await db.books.put(buildBook(coreFields, copies, input));
}
```

(d) Replace the ownership mutations `setCopies`, `addCopy`, and add `setWanted` (delete the old `setCopies`/`addCopy` bodies):

```ts
/** Set owned copies. 0 turns the book into an unowned (not-wanted) record. */
export async function setCopies(id: string, n: number) {
	const b = await db.books.get(id);
	if (!b) return;
	await db.books.put(withCopies(b, n));
}

/** Add a copy (or acquire an unowned book). */
export async function addCopy(id: string) {
	const b = await db.books.get(id);
	if (!b) return;
	await db.books.put(acquired(b));
}

/** Mark an unowned book as wanted / not-wanted (wishlist toggle). No-op if owned. */
export async function setWanted(id: string, wanted: boolean) {
	const b = await db.books.get(id);
	if (!b) return;
	await db.books.put(withWanted(b, wanted));
}
```

(e) Change `updateBook`'s signature to core-only (prevents variant corruption via shallow merge):

```ts
export async function updateBook(id: string, patch: Partial<BookCore>) {
	await db.books.update(id, patch);
}
```

Leave `setStatus`, `updateProgress`, `markFinished`, `setRating`, `findByIsbn`, `lendBook`, `returnLoan`, `deleteBook`, `exportBackup`, `importBackup`, `ensureTag`, `renameTag`, `deleteTag`, `mergeTags` unchanged — they touch only core/reading fields or other tables.

- [ ] **Step 7: Rewrite `src/lib/seed.ts` authoring helper**

Replace the `Seed` type and `make` function (lines ~29–40) with:

```ts
type Seed = {
	title: string;
	author: string;
	status: Status;
	pages: number;
	currentPage?: number;
	rating?: number;
	copies?: number; // default 1; 0 => wishlist
	wanted?: boolean; // only consulted when copies === 0 (default true)
	genres?: string[];
	labels?: string[];
	notes?: string;
	format?: string;
	pricePaid?: number;
	estValue?: number;
	year?: number;
	publisher?: string;
	isbn?: string;
	seriesId?: string;
	seriesIndex?: number;
	startedAt?: number;
	finishedAt?: number;
	addedAt?: number;
	coverImage?: string;
};

const make = ({ genres, labels, copies = 1, wanted, format, pricePaid, estValue, ...s }: Seed): Book => {
	const base: BookCore = {
		id: crypto.randomUUID(),
		...s,
		currentPage: s.currentPage ?? 0,
		cover: coverFor(s.title),
		addedAt: s.addedAt ?? d(2026, 1, 1),
		tagIds: [...resolve(genres), ...resolve(labels)]
	};
	return copies >= 1
		? { ...base, owned: true, copies, format, pricePaid, estValue }
		: { ...base, owned: false, wanted: wanted ?? true, estValue };
};
```

Add `import type { Book, BookCore, Loan, Series, Tag } from './types';` (add `BookCore`) and `import type { Status } from './types';` if not already covered — consolidate to one import line:

```ts
import type { Book, BookCore, Loan, Series, Status, Tag } from './types';
```

The three existing `copies: 0` wishlist entries need no change (they now build the wished variant automatically). Add one "read at a library, not owned" example to the raw list (after the wishlist block):

```ts
{ title: 'The Dispossessed', author: 'Ursula K. Le Guin', status: 'completed', pages: 387, currentPage: 387, rating: 5, copies: 0, wanted: false, genres: ['Sci-fi'], finishedAt: d(2026, 6, 20) },
```

- [ ] **Step 8: Update `src/lib/components/BookForm.svelte`**

Change the props/`initial` type and derived seeds so owned-only fields read through a guard. Replace lines 14–38 (the `Values` type, props block, and field seeds) with:

```ts
	import type { Book, Status } from '$lib/types';
	import type { BookInput } from '$lib/db';
	// ...keep other imports...

	let {
		initial,
		submitLabel = 'Add to shelf',
		onsubmit
	}: {
		initial?: Book;
		submitLabel?: string;
		onsubmit: (values: BookInput) => void;
	} = $props();

	// form fields
	let title = $state(initial?.title ?? '');
	let author = $state(initial?.author ?? '');
	let isbn = $state(initial?.isbn ?? '');
	let pages = $state(initial?.pages ? String(initial.pages) : '');
	let status = $state<Status>(initial?.status ?? 'to-read');
	let copies = $state(initial ? (initial.owned ? String(initial.copies) : '0') : '1');
	const isWish = $derived(Number(copies) === 0);
	let format = $state(initial && initial.owned ? (initial.format ?? '') : '');
	let price = $state(initial && initial.owned && initial.pricePaid != null ? String(initial.pricePaid) : '');
	let year = $state(initial?.year ? String(initial.year) : '');
	let publisher = $state(initial?.publisher ?? '');
	let coverImage = $state(initial?.coverImage);
```

Update the `$effect` that splits tags (line ~47) to read `initial?.tagIds ?? []`.

Replace the `submit` function payload (lines 103–120) with:

```ts
	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		const wish = Number(copies) === 0;
		onsubmit({
			title: title.trim(),
			author: author.trim() || 'Unknown',
			pages: Number(pages),
			status,
			currentPage: initial?.currentPage,
			copies: Math.max(0, Math.floor(Number(copies) || 0)),
			isbn: normalizeIsbn(isbn) ?? undefined,
			format: wish ? undefined : format.trim() || undefined,
			year: year ? Number(year) : undefined,
			publisher: publisher.trim() || undefined,
			pricePaid: wish ? undefined : price ? Number(price) : undefined,
			estValue: initial?.estValue,
			tagIds: [...genreIds, ...labelIds],
			coverImage
		});
	}
```

Hide the owned-only Format / Price fields when the book is a wish. Wrap the format/year `.two` block (lines 204–213) and the price `.field` block (lines 215–218) in `{#if !isWish}` … `{/if}`. (Year stays owned-agnostic in the model, but it lives in the same row as Format; move `year` into its own `{#if !isWish}`-independent row, or accept it hiding with Format — acceptable for now since a wished book rarely needs the print year in this form. Keep Format+Year together under `{#if !isWish}` for minimal churn.)

- [ ] **Step 9: Update `src/lib/components/AddBookModal.svelte`**

Replace the local `Values` type (line 10) and use `BookInput`:

```ts
	import type { Book } from '$lib/types';
	import type { BookInput } from '$lib/db';
	import { addBook, addCopy, findByIsbn } from '$lib/db';
	// ...
	let dup = $state<{ existing: Book; values: BookInput } | null>(null);

	async function handleSubmit(values: BookInput) {
		if (values.isbn) {
			const existing = await findByIsbn(values.isbn);
			if (existing) {
				dup = { existing, values };
				return;
			}
		}
		await addBook(values);
		closeModal();
	}
```

`addAsCopy` / `addAnyway` bodies are unchanged (they call `addCopy` / `addBook`).

- [ ] **Step 10: Update `src/routes/book/[id]/+page.svelte`**

(a) Imports: swap `updateBook` usage for edits to `saveBookEdits`, keep `updateBook` for notes/tags, and import `BookInput`:

```ts
	import type { Book } from '$lib/types';
	import type { BookInput } from '$lib/db';
	import {
		bookById, setStatus, setRating, updateBook, addCopy, deleteBook, saveBookEdits
	} from '$lib/db';
```

(b) `saveEdit`:

```ts
	function saveEdit(values: BookInput) {
		saveBookEdits(id, values);
		showEdit = false;
	}
```

(c) Guard the inventory card (lines 102–113) on ownership; show a wishlist panel otherwise:

```svelte
			{#if book.owned}
				<div class="card">
					<span class="card-kicker">{t('detail.inventory')}</span>
					<div class="inv-grid">
						<div><div class="k">{t('detail.copies')}</div><div class="v">{book.copies}</div></div>
						<div><div class="k">{t('detail.format')}</div><div class="v">{book.format ?? '—'}</div></div>
						<div><div class="k">{t('detail.paid')}</div><div class="v">{book.pricePaid != null ? `€${book.pricePaid.toFixed(2)}` : '—'}</div></div>
						<div><div class="k">{t('detail.est_value')}</div><div class="v val">{book.estValue != null ? `€${book.estValue.toFixed(2)}` : '—'}</div></div>
					</div>
					<button class="btn btn-ghost" style="align-self:flex-start" onclick={() => addCopy(id)}>
						<Plus size={14} strokeWidth={2.4} /> {t('detail.add_copy')}
					</button>
				</div>
			{:else}
				<div class="card">
					<span class="card-kicker">{book.wanted ? t('detail.wishlist_kicker') : t('detail.not_owned_kicker')}</span>
					<div class="inv-grid">
						<div><div class="k">{t('detail.est_value')}</div><div class="v val">{book.estValue != null ? `€${book.estValue.toFixed(2)}` : '—'}</div></div>
					</div>
					<button class="btn btn-ghost" style="align-self:flex-start" onclick={() => addCopy(id)}>
						<Plus size={14} strokeWidth={2.4} /> {t('detail.acquire')}
					</button>
				</div>
			{/if}
```

The status select, progress card, tags, and notes stay unchanged (all core fields). `page.params.id` and the `Book` cast are unchanged.

- [ ] **Step 11: Update `src/lib/components/BookCard.svelte`**

Import the guard and narrow every `copies` access:

```ts
	import type { Book } from '$lib/types';
	import { isWishlist } from '$lib/types';
	import { t } from '$lib/i18n/index.svelte';
```

Replace the badge/meta conditionals:

```svelte
	<div class="cover-wrap">
		<BookCover {book} size="md" />
		{#if book.owned && book.copies > 1}
			<span class="badge">×{book.copies}</span>
		{/if}
		{#if isWishlist(book)}
			<span class="badge wish">{t('status.wishlist')}</span>
		{/if}
	</div>

	{#if book.status === 'reading'}
		<ProgressBar value={book.currentPage} max={book.pages} />
	{/if}

	<div class="title">{book.title}</div>

	{#if !book.owned}
		<div class="meta">
			<span>{book.estValue ? t('common.unowned_price', { price: book.estValue }) : t('common.unowned')}</span>
		</div>
	{:else if book.status === 'reading'}
		<div class="meta">
			<span>p. {book.currentPage} / {book.pages}</span>
			<span>{pct}%</span>
		</div>
	{:else if book.rating}
		<div class="meta">
			<StarRating value={book.rating} readonly size={12} />
			{#if book.seriesIndex}<span class="dim">#{book.seriesIndex}</span>{/if}
		</div>
	{:else}
		<div class="meta"><span class="dim">{book.author}</span></div>
	{/if}
```

- [ ] **Step 12: Update the shelf `src/routes/+page.svelte`**

Import the guard and rework the ownership/status predicates:

```ts
	import { books, tags as tagStore } from '$lib/db';
	import { isWishlist } from '$lib/types';
```

Replace `inFilter` (lines 28–32):

```ts
	function inFilter(b: Book): boolean {
		if (filter === 'all') return true;
		if (filter === 'wishlist') return isWishlist(b);
		return !isWishlist(b) && b.status === filter;
	}
```

Replace the `sectionDefs` predicates (lines 37–43) — wishlist = `isWishlist`, status groups = everything else by status:

```ts
	const sectionDefs = $derived([
		{ key: 'reading', label: t('section.reading'), pred: (b: Book) => !isWishlist(b) && b.status === 'reading' },
		{ key: 'to-read', label: t('status.to-read'), pred: (b: Book) => !isWishlist(b) && b.status === 'to-read' },
		{ key: 'completed', label: t('status.completed'), pred: (b: Book) => !isWishlist(b) && b.status === 'completed' },
		{ key: 'wont-read', label: t('status.wont-read'), pred: (b: Book) => !isWishlist(b) && b.status === 'wont-read' },
		{ key: 'wishlist', label: t('status.wishlist'), pred: (b: Book) => isWishlist(b) }
	]);
```

Replace the count derivations (lines 50–53):

```ts
	const statusCount = $derived(
		(s: Status) => $books.filter((b) => !isWishlist(b) && b.status === s).length
	);
	const wishlistCount = $derived($books.filter(isWishlist).length);
```

- [ ] **Step 13: Update `src/lib/stats.ts`**

Narrow the owned filter to the guard (line 20) and copy-count reads:

```ts
	const owned = books.filter((b): b is import('./types').OwnedBook => b.owned);
```

The rest of `deriveStats` already reads `b.copies`, `b.pricePaid`, `b.estValue` only from `owned`, so those accesses now typecheck. `finishedThisYear`/`pagesThisYear` iterate all `books` on core fields (`finishedAt`, `pages`) — unchanged.

- [ ] **Step 14: Add i18n keys**

In `src/lib/i18n/locales/en.ts`, inside the "book detail" block, add:

```ts
	'detail.wishlist_kicker': 'Wishlist',
	'detail.not_owned_kicker': 'Not owned',
	'detail.acquire': 'I own this now',
```

In `src/lib/i18n/locales/sk.ts`, add:

```ts
	'detail.wishlist_kicker': 'Zoznam želaní',
	'detail.not_owned_kicker': 'Nevlastním',
	'detail.acquire': 'Už to vlastním',
```

- [ ] **Step 15: Run the full type check and tests**

Run: `npm run check`
Expected: `0 ERRORS` (17 expected warnings). Fix any narrowing errors the compiler flags (they will be genuine missing `book.owned` guards).

Run: `npm test`
Expected: PASS (harness + transitions).

- [ ] **Step 16: Build**

Run: `npm run build`
Expected: `✔ done` (adapter-static wrote the site).

- [ ] **Step 17: Manual smoke (reseed) — record what you verified**

Run: `npm run dev`, open the app, and in DevTools → Application → IndexedDB delete the `henkas-lib` database once (or bump is already handled by v3), reload to reseed. Verify:
- Shelf shows status groups plus a **Wishlist** section; *The Dispossessed* appears under **Completed** (read, not owned), not Wishlist.
- Open a wishlist book → detail shows the wishlist panel with **I own this now**; clicking it moves the book into an owned status group with 1 copy, status preserved.
- Open an owned finished book → edit → set Copies to 0 → save → it leaves Wishlist logic as "not owned" but keeps its Completed status.
- Add a new book with Copies 0 → lands in Wishlist.

- [ ] **Step 18: Update `AGENTS.md` data-model section**

Rewrite the "Data model" bullets to describe the union (owned vs wished variants, reading orthogonal, `isOwned`/`isWishlist` guards, `copies` a pure owned count, wishlist = `!owned && wanted`). Reference ADR 0008 instead of 0004.

- [ ] **Step 19: Set task 0011 to done, commit everything**

Set `state: done` and bump `updated` in `tasks/0011-ownership-reading-model-refactor.md`, check off its DoD, add a "Done notes" section.

```bash
git add -A
git commit -m "refactor: ownership as a discriminated union (task 0011, ADR 0008)

Book is now OwnedBook | WishedBook over a shared BookCore; reading fields
are common (valid whether or not you own a copy). copies:0 and owned+wished
are unrepresentable. Pure transitions (withCopies/acquired/withWanted) in
ownership.ts are unit-tested; Dexie mutations put() a rebuilt row so no
stale variant fields linger. Schema v3 reseeds. All consumers narrow on
book.owned.

Claude-Session: https://claude.ai/code/session_01PW3L8es9LPSRwmbduaCuws"
```

---

## Self-Review

**Spec coverage (ADR 0008 / task 0011):**
- Discriminated union + guards → Task 2 Step 1. ✓
- `copies:0` / owned+wished unrepresentable → union shape, Step 1; asserted in tests Step 2. ✓
- Reading orthogonal (common fields) → `BookCore`, Step 1; preservation asserted in transition tests. ✓
- Variant transitions via `put`, reading preserved → `ownership.ts` Step 4, db mutations Step 6d. ✓
- New "unowned & not-wanted" state → seed example Step 7; shelf places it under status not Wishlist Step 12; detail panel Step 10. ✓
- Schema v3 reseed, no migration → Step 6b. ✓
- Form creates owned + wishlist → Steps 8–9; manual check Step 17. ✓
- Strings via t() en+sk → Step 14. ✓
- check clean + build pass → Steps 15–16. ✓
- AGENTS.md updated → Step 18. ✓
- Follow-up module split is out of scope (task 0012). ✓

**Placeholder scan:** No TBD/TODO; every code step carries full code. Manual step 17 lists concrete checks. ✓

**Type consistency:** `withCopies`/`acquired`/`withWanted` signatures match between the Interfaces block, `ownership.ts` (Step 4), the tests (Step 2), and db callers (Step 6d). `BookInput` is defined once (Step 6c) and consumed by `BookForm`, `AddBookModal`, and the detail page with the same shape. `updateBook` is `Partial<BookCore>` everywhere. ✓
