import { describe, it, expect } from 'vitest';
import type { Book, OwnedBook, WishedBook } from './types';
import { withCopies, acquired, withWanted, wantedAfterEdit } from './ownership';

const owned = (over: Partial<OwnedBook> = {}): OwnedBook => ({
	id: 'b1', title: 'T', author: 'A', pages: 300, entryIds: [], tagIds: [],
	cover: { from: '#000', to: '#111', ink: '#fff', sub: '#ccc' }, addedAt: 1,
	status: 'completed', currentPage: 300, finishedAt: 999,
	owned: true, copies: 1, format: 'Hardcover', pricePaid: 20, ...over
});
const wished = (over: Partial<WishedBook> = {}): WishedBook => ({
	id: 'b2', title: 'W', author: 'A', pages: 200, entryIds: [], tagIds: [],
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
		// The value axis does not cross the boundary (ADR 0010): what it cost
		// says nothing about what replacing it would cost.
		expect(r.estValue).toBeUndefined();
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
		expect('estValue' in r).toBe(false);
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
		expect('estValue' in r).toBe(false);
	});
});

describe('wantedAfterEdit', () => {
	it('an owned book edited to 0 copies was given away, not wished', () => {
		expect(wantedAfterEdit(owned())).toBe(false);
	});
	it('an existing wish stays a wish', () => {
		expect(wantedAfterEdit(wished({ wanted: true }))).toBe(true);
	});
	it('a read-elsewhere record stays not-wanted', () => {
		expect(wantedAfterEdit(wished({ wanted: false }))).toBe(false);
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
