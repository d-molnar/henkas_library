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
