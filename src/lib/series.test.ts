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
