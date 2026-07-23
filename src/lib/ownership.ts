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
