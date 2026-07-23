import type { Readable } from 'svelte/store';
import type { Book, BookCore, Status } from './types';
import { db, live } from './db';
import { coverFor } from './covers';
import { normalizeIsbn } from './isbn';
import { withCopies, acquired, withWanted, wantedAfterEdit } from './ownership';

// ── Reactive collections ──────────────────────────────────────────────
export const books = live<Book[]>(() => db.books.toArray(), []);

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

function buildBook(coreFields: BookCore, copies: number, input: BookInput, wantedWhenUnowned = true): Book {
	return copies >= 1
		? { ...coreFields, owned: true, copies, format: input.format, pricePaid: input.pricePaid, estValue: input.estValue }
		: { ...coreFields, owned: false, wanted: wantedWhenUnowned, estValue: input.estValue };
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
	const wantedWhenUnowned = wantedAfterEdit(existing);
	await db.books.put(buildBook(coreFields, copies, input, wantedWhenUnowned));
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

export async function deleteBook(id: string) {
	await db.transaction('rw', db.books, db.loans, async () => {
		await db.books.delete(id);
		await db.loans.where('bookId').equals(id).delete();
	});
}
