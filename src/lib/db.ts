import Dexie, { liveQuery, type Table } from 'dexie';
import { readable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Book, Loan, Series, Tag, SeriesEntry } from './types';
import { seedBooks, seedLoans, seedSeries, seedSeriesEntries, seedTags } from './seed';

class HenkaDB extends Dexie {
	books!: Table<Book, string>;
	series!: Table<Series, string>;
	seriesEntries!: Table<SeriesEntry, string>;
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
		// v5 — sample cover images on some seeded books. Pre-release: no migration,
		// just clear everything so ensureSeeded() lays the starter library down
		// again. Clearing *all* tables (not just books/series/loans) matters —
		// seedTags have fixed ids, so a leftover tags table makes the reseed
		// bulkAdd fail on a duplicate key and abort the whole transaction.
		this.version(5)
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
				await tx.table('seriesEntries').clear();
				await tx.table('loans').clear();
				await tx.table('tags').clear();
			});
		// v6 — the value axis follows ownership (ADR 0010): OwnedBook drops
		// estValue. Pre-release: clear and reseed rather than migrate.
		this.version(6)
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
				await tx.table('seriesEntries').clear();
				await tx.table('loans').clear();
				await tx.table('tags').clear();
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
				await db.transaction('rw', db.books, db.series, db.seriesEntries, db.loans, db.tags, async () => {
					// put, not add: the seed ids are fixed, so a reseed over a
					// half-cleared db must overwrite rather than throw.
					await db.tags.bulkPut(seedTags);
					await db.books.bulkAdd(seedBooks);
					await db.series.bulkPut(seedSeries);
					await db.seriesEntries.bulkPut(seedSeriesEntries);
					await db.loans.bulkAdd(seedLoans);
				});
			}
		})();
	}
	return seedPromise;
}

/** Wrap a Dexie liveQuery in a Svelte-compatible readable store. */
export function live<T>(query: () => T | Promise<T>, initial: T): Readable<T> {
	return readable<T>(initial, (set) => {
		if (!browser) return;
		const sub = liveQuery(query).subscribe({
			next: (v) => set(v),
			error: (e) => console.error('liveQuery error', e)
		});
		return () => sub.unsubscribe();
	});
}
