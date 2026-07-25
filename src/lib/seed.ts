import type { Book, BookCore, Loan, Series, SeriesEntry, Status, Tag } from './types';
import { coverFor } from './covers';

/** 2026 timestamps helper */
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day).getTime();

export const seedSeries: Series[] = [
	{ id: 'kingkiller', name: 'The Kingkiller Chronicle', author: 'Patrick Rothfuss' },
	{ id: 'earthsea', name: 'Earthsea Cycle', author: 'Ursula K. Le Guin' },
	{ id: 'broken-earth', name: 'The Broken Earth', author: 'N. K. Jemisin' }
];

// Canonical volumes. Some have no owned book (named-missing); one Kingkiller entry is
// a novella (ordinal 2.5); Broken Earth is provided by a single omnibus book.
export const seedSeriesEntries: SeriesEntry[] = [
	// Kingkiller — demonstrates a novella (half ordinal)
	{ id: 'e-kk-1', seriesId: 'kingkiller', ordinal: 1, label: '1', title: 'The Name of the Wind' },
	{ id: 'e-kk-2', seriesId: 'kingkiller', ordinal: 2, label: '2', title: "The Wise Man's Fear" },
	{ id: 'e-kk-25', seriesId: 'kingkiller', ordinal: 2.5, label: '2.5', title: 'The Slow Regard of Silent Things' },
	// Earthsea — demonstrates named-missing (e-es-5) and read-elsewhere (e-es-6)
	{ id: 'e-es-1', seriesId: 'earthsea', ordinal: 1, label: '1', title: 'A Wizard of Earthsea' },
	{ id: 'e-es-2', seriesId: 'earthsea', ordinal: 2, label: '2', title: 'The Tombs of Atuan' },
	{ id: 'e-es-3', seriesId: 'earthsea', ordinal: 3, label: '3', title: 'The Farthest Shore' },
	{ id: 'e-es-4', seriesId: 'earthsea', ordinal: 4, label: '4', title: 'Tehanu' },
	{ id: 'e-es-5', seriesId: 'earthsea', ordinal: 5, label: '5', title: 'Tales from Earthsea' },
	{ id: 'e-es-6', seriesId: 'earthsea', ordinal: 6, label: '6', title: 'The Other Wind' },
	// Broken Earth — provided by one omnibus book
	{ id: 'e-be-1', seriesId: 'broken-earth', ordinal: 1, label: '1', title: 'The Fifth Season' },
	{ id: 'e-be-2', seriesId: 'broken-earth', ordinal: 2, label: '2', title: 'The Obelisk Gate' },
	{ id: 'e-be-3', seriesId: 'broken-earth', ordinal: 3, label: '3', title: 'The Stone Sky' }
];

// Tags are entities with stable ids. Genres are tags with kind 'genre'.
export const seedTags: Tag[] = [
	{ id: 'g-fantasy', name: 'Fantasy', kind: 'genre' },
	{ id: 'g-scifi', name: 'Sci-fi', kind: 'genre' },
	{ id: 'g-nature', name: 'Nature', kind: 'genre' },
	{ id: 'g-history', name: 'History', kind: 'genre' },
	{ id: 'g-literary', name: 'Literary', kind: 'genre' },
	{ id: 'l-book-club', name: 'Book club', kind: 'label' },
	{ id: 'l-favourite', name: 'Favourite', kind: 'label' }
];

const tagIdByName = new Map(seedTags.map((t) => [t.name.toLowerCase(), t.id]));
const resolve = (names: string[] = []): string[] =>
	names.map((n) => tagIdByName.get(n.toLowerCase())).filter((id): id is string => Boolean(id));

// Authoring convenience: seeds list genre + label names; we resolve to tag ids.
type Seed = {
	title: string;
	author: string;
	status: Status;
	pages: number;
	currentPage?: number;
	rating?: number;
	copies?: number; // default 1; 0 => wishlist
	wanted?: boolean; // only consulted when copies === 0 (default true)
	genres?: string[];
	labels?: string[];
	notes?: string;
	format?: string;
	pricePaid?: number;
	estValue?: number;
	year?: number;
	publisher?: string;
	isbn?: string;
	entryIds?: string[];
	startedAt?: number;
	finishedAt?: number;
	addedAt?: number;
	coverImage?: string;
};

const make = ({ genres, labels, copies = 1, wanted, format, pricePaid, estValue, ...s }: Seed): Book => {
	const base: BookCore = {
		id: crypto.randomUUID(),
		...s,
		currentPage: s.currentPage ?? 0,
		cover: coverFor(s.title),
		addedAt: s.addedAt ?? d(2026, 1, 1),
		entryIds: s.entryIds ?? [],
		tagIds: [...resolve(genres), ...resolve(labels)]
	};
	return copies >= 1
		? { ...base, owned: true, copies, format, pricePaid }
		: { ...base, owned: false, wanted: wanted ?? true, estValue };
};

const raw: Seed[] = [
	// ── Reading now ──
	{
		title: 'The Buried Giant',
		coverImage: '/covers/the-buried-giant.svg',
		author: 'Kazuo Ishiguro',
		status: 'reading',
		pages: 310,
		currentPage: 192,
		rating: 4,
		labels: ['Book club', 'Favourite'],
		notes: 'The mist as collective forgetting — compare with the framing in Never Let Me Go. Axl & Beatrice’s tenderness carries the whole quest structure. Re-read ch. 9 before book club.',
		format: 'Hardcover',
		pricePaid: 26,
		year: 2015,
		publisher: 'Faber & Faber',
		genres: ['Fantasy', 'Literary'],
		startedAt: d(2026, 2, 18),
		addedAt: d(2026, 2, 10)
	},
	{
		title: 'Braiding Sweetgrass',
		coverImage: '/covers/braiding-sweetgrass.svg',
		author: 'Robin Wall Kimmerer',
		status: 'reading',
		pages: 390,
		currentPage: 108,
		genres: ['Nature'],
		format: 'Paperback',
		pricePaid: 14,
		startedAt: d(2026, 6, 30)
	},
	{
		title: 'Piranesi',
		coverImage: '/covers/piranesi.svg',
		author: 'Susanna Clarke',
		status: 'reading',
		pages: 245,
		currentPage: 206,
		rating: 5,
		genres: ['Fantasy'],
		format: 'Hardcover',
		pricePaid: 18,
		startedAt: d(2026, 7, 5)
	},

	// ── To-read next ──
	{
		title: 'The Name of the Wind',
		author: 'Patrick Rothfuss',
		status: 'to-read',
		pages: 662,
		rating: 5,
		copies: 2,
		year: 2007,
		publisher: 'DAW Books',
		genres: ['Fantasy'],
		isbn: '9780756404079',
		entryIds: ['e-kk-1'],
		pricePaid: 12
	},
	{
		title: "The Wise Man's Fear",
		author: 'Patrick Rothfuss',
		status: 'completed',
		pages: 994,
		currentPage: 994,
		rating: 4,
		year: 2011,
		publisher: 'DAW Books',
		genres: ['Fantasy'],
		entryIds: ['e-kk-2'],
		finishedAt: d(2026, 3, 20),
		pricePaid: 13
	},
	{
		title: 'The Slow Regard of Silent Things',
		author: 'Patrick Rothfuss',
		status: 'to-read',
		pages: 176,
		year: 2014,
		publisher: 'DAW Books',
		genres: ['Fantasy'],
		entryIds: ['e-kk-25']
	},
	{
		title: 'Entangled Life',
		author: 'Merlin Sheldrake',
		status: 'to-read',
		pages: 358,
		genres: ['Nature']
	},
	{
		title: 'Sea of Tranquility',
		author: 'Emily St. John Mandel',
		status: 'to-read',
		pages: 272,
		genres: ['Sci-fi']
	},

	// ── Wishlist (zero copies) ──
	{
		title: 'Tomorrow, and Tomorrow, and Tomorrow',
		author: 'Gabrielle Zevin',
		status: 'to-read',
		copies: 0,
		pages: 416,
		estValue: 18,
		genres: ['Literary']
	},
	{ title: 'The Overstory', author: 'Richard Powers', status: 'to-read', copies: 0, pages: 502, estValue: 16, genres: ['Nature'] },
	{ title: 'Babel', author: 'R. F. Kuang', status: 'to-read', copies: 0, pages: 546, estValue: 20, genres: ['Fantasy'] },

	// ── Read elsewhere, not owned (not wanted — already read it) ──
	{ title: 'The Dispossessed', author: 'Ursula K. Le Guin', status: 'completed', pages: 387, currentPage: 387, rating: 5, copies: 0, wanted: false, genres: ['Sci-fi'], finishedAt: d(2026, 6, 20) },

	// ── Won't read (owned but set aside) ──
	{ title: 'Infinite Jest', author: 'David Foster Wallace', status: 'wont-read', pages: 1079, genres: ['Literary'], format: 'Paperback', pricePaid: 18 },
	{ title: 'Atlas Shrugged', author: 'Ayn Rand', status: 'wont-read', pages: 1168, genres: ['Literary'], pricePaid: 9 },

	// ── On loan (owned, currently lent) ──
	{
		title: 'Project Hail Mary',
		coverImage: '/covers/project-hail-mary.svg',
		author: 'Andy Weir',
		status: 'to-read',
		pages: 476,
		genres: ['Sci-fi'],
		format: 'Hardcover',
		pricePaid: 22
	},
	{
		title: 'Circe',
		author: 'Madeline Miller',
		status: 'completed',
		pages: 393,
		currentPage: 393,
		rating: 5,
		genres: ['Fantasy'],
		finishedAt: d(2026, 1, 22),
		pricePaid: 15
	},

	// ── Earthsea ──
	{ title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', status: 'completed', pages: 183, currentPage: 183, rating: 5, genres: ['Fantasy'], entryIds: ['e-es-1'], finishedAt: d(2026, 1, 14), pricePaid: 9 },
	{ title: 'The Tombs of Atuan', author: 'Ursula K. Le Guin', status: 'completed', pages: 180, currentPage: 180, rating: 4, genres: ['Fantasy'], entryIds: ['e-es-2'], finishedAt: d(2026, 2, 2), pricePaid: 9 },
	{ title: 'The Farthest Shore', author: 'Ursula K. Le Guin', status: 'completed', pages: 197, currentPage: 197, rating: 4, genres: ['Fantasy'], entryIds: ['e-es-3'], finishedAt: d(2026, 2, 21), pricePaid: 9 },
	{ title: 'Tehanu', author: 'Ursula K. Le Guin', status: 'to-read', pages: 226, genres: ['Fantasy'], entryIds: ['e-es-4'], pricePaid: 9 },
	{ title: 'The Other Wind', author: 'Ursula K. Le Guin', status: 'completed', pages: 246, currentPage: 246, rating: 4, copies: 0, wanted: false, genres: ['Fantasy'], entryIds: ['e-es-6'], finishedAt: d(2026, 5, 12) },

	// ── Broken Earth ──
	{ title: 'The Broken Earth Trilogy', author: 'N. K. Jemisin', status: 'reading', pages: 1400, currentPage: 900, genres: ['Sci-fi'], format: 'Omnibus', entryIds: ['e-be-1', 'e-be-2', 'e-be-3'], pricePaid: 30, startedAt: d(2026, 7, 10) },

	// ── More completed across 2026 (drive the stats chart) ──
	{ title: 'Dune', author: 'Frank Herbert', coverImage: '/covers/dune.svg', status: 'completed', pages: 688, currentPage: 688, rating: 5, genres: ['Sci-fi'], finishedAt: d(2026, 1, 30), pricePaid: 10 },
	{ title: 'Klara and the Sun', author: 'Kazuo Ishiguro', status: 'completed', pages: 303, currentPage: 303, rating: 4, genres: ['Sci-fi'], finishedAt: d(2026, 2, 12), pricePaid: 16 },
	{ title: 'The Song of Achilles', author: 'Madeline Miller', status: 'completed', pages: 352, currentPage: 352, rating: 5, genres: ['Fantasy'], finishedAt: d(2026, 3, 5), pricePaid: 13 },
	{ title: 'A Short History of Nearly Everything', author: 'Bill Bryson', status: 'completed', pages: 544, currentPage: 544, rating: 4, genres: ['History'], finishedAt: d(2026, 3, 28), pricePaid: 12 },
	{ title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', status: 'completed', pages: 304, currentPage: 304, rating: 5, genres: ['Sci-fi'], finishedAt: d(2026, 4, 18), pricePaid: 10 },
	{ title: 'Wolf Hall', author: 'Hilary Mantel', status: 'completed', pages: 604, currentPage: 604, rating: 4, genres: ['History'], finishedAt: d(2026, 5, 6), pricePaid: 14 },
	{ title: 'Bring Up the Bodies', author: 'Hilary Mantel', status: 'completed', pages: 432, currentPage: 432, rating: 5, genres: ['History'], finishedAt: d(2026, 5, 20), pricePaid: 14 },
	{ title: 'The Hobbit', author: 'J. R. R. Tolkien', coverImage: '/covers/the-hobbit.svg', status: 'completed', pages: 310, currentPage: 310, rating: 5, genres: ['Fantasy'], finishedAt: d(2026, 5, 29), pricePaid: 8 },
	{ title: 'Educated', author: 'Tara Westover', status: 'completed', pages: 334, currentPage: 334, rating: 4, genres: ['History'], finishedAt: d(2026, 6, 15), pricePaid: 13 },
	{ title: 'The Underground Railroad', author: 'Colson Whitehead', status: 'completed', pages: 320, currentPage: 320, rating: 4, genres: ['History'], finishedAt: d(2026, 6, 27), pricePaid: 12 },
	{ title: 'Recursion', author: 'Blake Crouch', status: 'completed', pages: 336, currentPage: 336, rating: 4, genres: ['Sci-fi'], finishedAt: d(2026, 7, 8), pricePaid: 11 }
];

export const seedBooks: Book[] = raw.map(make);

/** Lending relationships, referenced by book title for readability. */
const byTitle = (t: string) => seedBooks.find((b) => b.title === t)!.id;

export const seedLoans: Loan[] = [
	{ id: crypto.randomUUID(), bookId: byTitle('Project Hail Mary'), borrower: 'Maya A.', initials: 'MA', avatarColor: '#ccdbb2', avatarInk: '#3d472b', since: d(2026, 3, 3), returnedAt: null },
	{ id: crypto.randomUUID(), bookId: byTitle('Circe'), borrower: 'Dad', initials: 'DA', avatarColor: '#ffc6a5', avatarInk: '#643312', since: d(2026, 6, 12), returnedAt: null },
	{ id: crypto.randomUUID(), bookId: byTitle('Entangled Life'), borrower: 'Sam R.', initials: 'SR', avatarColor: '#dcd3c4', avatarInk: '#474238', since: d(2026, 7, 1), returnedAt: null },
	// history
	{ id: crypto.randomUUID(), bookId: byTitle('The Buried Giant'), borrower: 'Sam R.', initials: 'SR', avatarColor: '#dcd3c4', avatarInk: '#474238', since: d(2025, 9, 20), returnedAt: d(2025, 11, 2) },
	{ id: crypto.randomUUID(), bookId: byTitle('Piranesi'), borrower: 'Priya', initials: 'PR', avatarColor: '#ffe1d0', avatarInk: '#643312', since: d(2025, 9, 1), returnedAt: d(2025, 10, 15) },
	{ id: crypto.randomUUID(), bookId: byTitle('Dune'), borrower: 'Marcus', initials: 'MR', avatarColor: '#e1eecc', avatarInk: '#3d472b', since: d(2025, 6, 12), returnedAt: d(2025, 8, 3) }
];
