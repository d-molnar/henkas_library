import Dexie, { liveQuery, type Table } from 'dexie';
import { readable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Book, Loan, Series, Tag } from './types';
import { seedBooks, seedLoans, seedSeries, seedTags } from './seed';

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
