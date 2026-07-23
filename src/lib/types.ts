/**
 * Reading status applies to a book regardless of whether you own it. Ownership
 * is derived from `Book.copies`: 0 copies means it's a wishlist item (see
 * isOwned / isWishlist below).
 */
export type Status = 'reading' | 'to-read' | 'completed' | 'wont-read';

/** A cover is a two-stop gradient plus the ink colors printed on it. */
export interface Cover {
	from: string;
	to: string;
	ink: string; // title colour
	sub: string; // author/subtitle colour
}

/**
 * Tags are entities with a stable id and a renameable display name — books
 * reference them by id so a rename (or, later, a translation) propagates
 * everywhere. Genres are just tags with kind 'genre'.
 */
export type TagKind = 'genre' | 'label';
export interface Tag {
	id: string;
	name: string;
	kind: TagKind;
}

export interface Book {
	id: string;
	title: string;
	author: string;
	status: Status;
	pages: number;
	currentPage: number;
	rating?: number; // 0–5
	tagIds: string[]; // references into the tags table (genres + labels alike)
	notes?: string;
	format?: string;
	pricePaid?: number;
	estValue?: number;
	copies: number;
	cover: Cover;
	coverImage?: string; // real cover URL (e.g. from Open Library); falls back to the gradient
	year?: number;
	publisher?: string;
	isbn?: string;
	seriesId?: string;
	seriesIndex?: number;
	addedAt: number;
	startedAt?: number;
	finishedAt?: number;
}

export interface Series {
	id: string;
	name: string;
	author: string;
	totalVolumes: number;
}

export interface Loan {
	id: string;
	bookId: string;
	borrower: string;
	initials: string;
	avatarColor: string;
	avatarInk: string;
	since: number;
	returnedAt?: number | null;
}

export const READING_STATUSES: Status[] = ['reading', 'to-read', 'completed', 'wont-read'];

/** Ownership is derived: you own the book if you have at least one copy. */
export const isOwned = (b: Pick<Book, 'copies'>): boolean => b.copies > 0;
/** A book with zero copies is a wishlist item — it's only in the library because you want it. */
export const isWishlist = (b: Pick<Book, 'copies'>): boolean => b.copies === 0;
