import Dexie, { liveQuery, type Table } from 'dexie';
import { readable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Book, BookCore, Loan, Series, Status, Tag, TagKind } from './types';
import { seedBooks, seedLoans, seedSeries, seedTags } from './seed';
import { coverFor } from './covers';
import { normalizeIsbn } from './isbn';
import { withCopies, acquired, withWanted } from './ownership';

class HenkaDB extends Dexie {
	books!: Table<Book, string>;
	series!: Table<Series, string>;
	loans!: Table<Loan, string>;
	tags!: Table<Tag, string>;

	constructor() {
		super('henkas-lib');
		// v1 — original shape (no tags table; books carried genre/tags strings).
		this.version(1).stores({
			// isbn is indexed for lookup/dedup but is NOT identity — id (UUID) is.
			books: 'id, status, seriesId, addedAt, finishedAt, isbn',
			series: 'id',
			loans: 'id, bookId, returnedAt'
		});
		// v2 — tags become entities; books reference tagIds; ownership is copies.
		// The data model changed enough that a clean reseed is the honest migration
		// for this prototype: clear the old rows so ensureSeeded() repopulates.
		this.version(2)
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
	}
}

export const db = new HenkaDB();

let seedPromise: Promise<void> | null = null;

/** Populate the starter library the first time the app runs in this browser. */
export async function ensureSeeded(): Promise<void> {
	if (!browser) return;
	if (!seedPromise) {
		seedPromise = (async () => {
			const count = await db.books.count();
			if (count === 0) {
				await db.transaction('rw', db.books, db.series, db.loans, db.tags, async () => {
					await db.tags.bulkAdd(seedTags);
					await db.books.bulkAdd(seedBooks);
					await db.series.bulkAdd(seedSeries);
					await db.loans.bulkAdd(seedLoans);
				});
			}
		})();
	}
	return seedPromise;
}

/** Wrap a Dexie liveQuery in a Svelte-compatible readable store. */
function live<T>(query: () => T | Promise<T>, initial: T): Readable<T> {
	return readable<T>(initial, (set) => {
		if (!browser) return;
		const sub = liveQuery(query).subscribe({
			next: (v) => set(v),
			error: (e) => console.error('liveQuery error', e)
		});
		return () => sub.unsubscribe();
	});
}

// ── Reactive collections ──────────────────────────────────────────────
export const books = live<Book[]>(() => db.books.toArray(), []);
export const series = live<Series[]>(() => db.series.toArray(), []);
export const loans = live<Loan[]>(() => db.loans.toArray(), []);
export const tags = live<Tag[]>(() => db.tags.toArray(), []);
export const activeLoans = live<Loan[]>(
	() => db.loans.filter((l) => l.returnedAt == null).toArray(),
	[]
);

export function bookById(id: string): Readable<Book | undefined> {
	return live<Book | undefined>(() => db.books.get(id), undefined);
}

// ── Mutations ─────────────────────────────────────────────────────────
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

// ── Tags ──────────────────────────────────────────────────────────────
/** Find a tag by name+kind (case-insensitive), or create it. Returns its id. */
export async function ensureTag(name: string, kind: TagKind): Promise<string> {
	const trimmed = name.trim();
	const existing = (await db.tags.where('kind').equals(kind).toArray()).find(
		(t) => t.name.toLowerCase() === trimmed.toLowerCase()
	);
	if (existing) return existing.id;
	const id = crypto.randomUUID();
	await db.tags.add({ id, name: trimmed, kind });
	return id;
}

/** Rename a tag in one place — every book referencing it updates automatically. */
export async function renameTag(id: string, name: string) {
	await db.tags.update(id, { name: name.trim() });
}

export async function deleteTag(id: string) {
	await db.transaction('rw', db.tags, db.books, async () => {
		await db.tags.delete(id);
		// drop the reference from any book that had it
		const affected = await db.books.filter((b) => b.tagIds.includes(id)).toArray();
		await Promise.all(
			affected.map((b) => db.books.update(b.id, { tagIds: b.tagIds.filter((t) => t !== id) }))
		);
	});
}

/**
 * Merge `fromId` into `intoId`: every book referencing the source now references
 * the target (deduped), and the source tag is deleted. No-op if they're equal.
 */
export async function mergeTags(fromId: string, intoId: string) {
	if (fromId === intoId) return;
	await db.transaction('rw', db.tags, db.books, async () => {
		const affected = await db.books.filter((b) => b.tagIds.includes(fromId)).toArray();
		await Promise.all(
			affected.map((b) => {
				// swap fromId → intoId, then dedup while preserving order
				const tagIds = [...new Set(b.tagIds.map((t) => (t === fromId ? intoId : t)))];
				return db.books.update(b.id, { tagIds });
			})
		);
		await db.tags.delete(fromId);
	});
}

/** Find an existing book by ISBN (normalized). Used for duplicate detection on add. */
export async function findByIsbn(rawIsbn: string): Promise<Book | undefined> {
	const norm = normalizeIsbn(rawIsbn);
	if (!norm) return undefined;
	return db.books.where('isbn').equals(norm).first();
}

export async function updateBook(id: string, patch: Partial<BookCore>) {
	await db.books.update(id, patch);
}

export async function setStatus(id: string, status: Status) {
	const patch: Partial<Book> = { status };
	if (status === 'completed') {
		const b = await db.books.get(id);
		if (b) {
			patch.currentPage = b.pages;
			patch.finishedAt = Date.now();
		}
	}
	await db.books.update(id, patch);
}

/** Set owned copies. 0 turns the book into an unowned (not-wanted) record. */
export async function setCopies(id: string, n: number) {
	const b = await db.books.get(id);
	if (!b) return;
	await db.books.put(withCopies(b, n));
}

/** Mark an unowned book as wanted / not-wanted (wishlist toggle). No-op if owned. */
export async function setWanted(id: string, wanted: boolean) {
	const b = await db.books.get(id);
	if (!b) return;
	await db.books.put(withWanted(b, wanted));
}

export async function setRating(id: string, rating: number) {
	await db.books.update(id, { rating });
}

export async function updateProgress(id: string, currentPage: number) {
	const b = await db.books.get(id);
	if (!b) return;
	const patch: Partial<Book> = { currentPage: Math.max(0, Math.min(currentPage, b.pages)) };
	if (b.status === 'to-read' && currentPage > 0) {
		patch.status = 'reading';
		patch.startedAt = b.startedAt ?? Date.now();
	}
	await db.books.update(id, patch);
}

export async function markFinished(id: string) {
	const b = await db.books.get(id);
	if (!b) return;
	await db.books.update(id, {
		status: 'completed',
		currentPage: b.pages,
		finishedAt: Date.now()
	});
}

/** Add a copy (or acquire an unowned book). */
export async function addCopy(id: string) {
	const b = await db.books.get(id);
	if (!b) return;
	await db.books.put(acquired(b));
}

export async function lendBook(bookId: string, loan: Omit<Loan, 'id' | 'bookId' | 'since' | 'returnedAt'> & { since?: number }) {
	await db.loans.add({
		id: crypto.randomUUID(),
		bookId,
		since: loan.since ?? Date.now(),
		returnedAt: null,
		...loan
	});
}

export async function returnLoan(loanId: string) {
	await db.loans.update(loanId, { returnedAt: Date.now() });
}

export async function deleteBook(id: string) {
	await db.transaction('rw', db.books, db.loans, async () => {
		await db.books.delete(id);
		await db.loans.where('bookId').equals(id).delete();
	});
}

/** Export the whole library as a JSON blob (backup). */
export async function exportBackup(): Promise<string> {
	const [b, s, l] = await Promise.all([db.books.toArray(), db.series.toArray(), db.loans.toArray()]);
	return JSON.stringify({ version: 1, exportedAt: Date.now(), books: b, series: s, loans: l }, null, 2);
}

export async function importBackup(json: string) {
	const data = JSON.parse(json);
	await db.transaction('rw', db.books, db.series, db.loans, async () => {
		await Promise.all([db.books.clear(), db.series.clear(), db.loans.clear()]);
		await db.books.bulkAdd(data.books ?? []);
		await db.series.bulkAdd(data.series ?? []);
		await db.loans.bulkAdd(data.loans ?? []);
	});
}
