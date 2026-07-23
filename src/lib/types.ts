export type Status = 'reading' | 'to-read' | 'completed' | 'wont-read';
export const READING_STATUSES: Status[] = ['reading', 'to-read', 'completed', 'wont-read'];

export interface Cover {
	from: string;
	to: string;
	ink: string;
	sub: string;
}

export type TagKind = 'genre' | 'label';
export interface Tag {
	id: string;
	name: string;
	kind: TagKind;
}

/** Fields intrinsic to the work + the reading axis — present on every book,
 *  independent of ownership (you can read a book you don't own). */
export interface BookCore {
	id: string;
	title: string;
	author: string;
	pages: number;
	isbn?: string;
	year?: number;
	publisher?: string;
	seriesId?: string;
	seriesIndex?: number;
	tagIds: string[];
	notes?: string;
	cover: Cover;
	coverImage?: string;
	addedAt: number;
	// reading axis
	status: Status;
	currentPage: number;
	startedAt?: number;
	finishedAt?: number;
	rating?: number;
}

export interface OwnedBook extends BookCore {
	owned: true;
	copies: number; // always >= 1
	format?: string;
	pricePaid?: number;
	estValue?: number;
}

export interface WishedBook extends BookCore {
	owned: false;
	wanted: boolean; // true => wishlist item
	estValue?: number;
}

export type Book = OwnedBook | WishedBook;

export const isOwned = (b: Book): b is OwnedBook => b.owned;
export const isWishlist = (b: Book): boolean => !b.owned && b.wanted;

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
