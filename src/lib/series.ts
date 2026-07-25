import type { Series, SeriesEntry, Book, OwnedBook, WishedBook } from './types';
import { db, live } from './db';

// ── Reactive collections ──────────────────────────────────────────────
export const series = live<Series[]>(() => db.series.toArray(), []);
export const seriesEntries = live<SeriesEntry[]>(() => db.seriesEntries.toArray(), []);

// ── Progress derivation ───────────────────────────────────────────────
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
