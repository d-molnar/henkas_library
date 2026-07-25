import { normalizeIsbn } from './isbn';

/** The subset of book fields an online lookup can pre-fill in the manual form. */
export interface LookupResult {
	title: string;
	author: string;
	pages?: number;
	year?: number;
	publisher?: string;
	isbn?: string;
	genre?: string;
	coverImage?: string;
	series?: string; // raw Open Library series string, e.g. "Earthsea #1" (often absent)
}

const yearFrom = (s?: string): number | undefined => {
	if (!s) return undefined;
	const m = s.match(/\d{4}/);
	return m ? Number(m[0]) : undefined;
};

/**
 * Look up a single edition by ISBN via Open Library's Books API.
 * One request returns author names + cover, unlike the raw /isbn endpoint.
 */
export async function lookupIsbn(rawIsbn: string, signal?: AbortSignal): Promise<LookupResult | null> {
	const norm = normalizeIsbn(rawIsbn);
	if (!norm) return null;
	const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${norm}&format=json&jscmd=data`;
	const res = await fetch(url, { signal });
	if (!res.ok) return null;
	const data = await res.json();
	const rec = data[`ISBN:${norm}`];
	if (!rec) return null;
	return {
		title: rec.title ?? '',
		author: (rec.authors ?? []).map((a: { name: string }) => a.name).join(', ') || 'Unknown',
		pages: rec.number_of_pages,
		year: yearFrom(rec.publish_date),
		publisher: (rec.publishers ?? []).map((p: { name: string }) => p.name)[0],
		isbn: norm,
		genre: (rec.subjects ?? []).map((s: { name: string }) => s.name)[0],
		coverImage: rec.cover?.medium ?? `https://covers.openlibrary.org/b/isbn/${norm}-M.jpg`,
		series: Array.isArray(rec.series) ? rec.series[0]?.name ?? rec.series[0] : rec.series
	};
}

export interface SearchHit extends LookupResult {
	key: string;
}

/** Free-text search by title/author (used by the online-search add path). */
export async function searchBooks(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
	const q = query.trim();
	if (!q) return [];
	const url =
		`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8` +
		`&fields=key,title,author_name,first_publish_year,number_of_pages_median,isbn,cover_i,publisher`;
	const res = await fetch(url, { signal });
	if (!res.ok) return [];
	const data = await res.json();
	return (data.docs ?? []).map((doc: Record<string, unknown>) => {
		const isbn = normalizeIsbn((doc.isbn as string[] | undefined)?.[0]);
		return {
			key: doc.key as string,
			title: (doc.title as string) ?? '',
			author: ((doc.author_name as string[] | undefined) ?? []).join(', ') || 'Unknown',
			pages: doc.number_of_pages_median as number | undefined,
			year: doc.first_publish_year as number | undefined,
			publisher: ((doc.publisher as string[] | undefined) ?? [])[0],
			isbn: isbn ?? undefined,
			coverImage: doc.cover_i
				? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
				: isbn
					? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
					: undefined
		} satisfies SearchHit;
	});
}

export interface RosterVolume {
	ordinal: number;
	title: string;
}

// Local copy of the hint pattern (kept here to avoid a series.ts → openlibrary.ts import).
function ordinalFromSeries(raw: string): number | undefined {
	const m = raw.match(/(?:#|\(|book\s+|vol\.?\s*|no\.?\s*)\s*(\d+(?:\.\d+)?)/i);
	return m ? Number(m[1]) : undefined;
}

/** Pure: turn an Open Library search response into a sorted, deduped roster. */
export function parseRosterResponse(json: unknown): RosterVolume[] {
	const docs = (json as { docs?: unknown[] })?.docs;
	if (!Array.isArray(docs)) return [];
	const byOrdinal = new Map<number, RosterVolume>();
	for (const d of docs) {
		const doc = d as { title?: string; series?: unknown };
		const seriesStr = Array.isArray(doc.series) ? String(doc.series[0]) : undefined;
		const ordinal = seriesStr ? ordinalFromSeries(seriesStr) : undefined;
		if (ordinal == null || !doc.title) continue;
		if (!byOrdinal.has(ordinal)) byOrdinal.set(ordinal, { ordinal, title: doc.title });
	}
	return [...byOrdinal.values()].sort((a, b) => a.ordinal - b.ordinal);
}

/**
 * Best-effort: fetch the volumes of a series by name. Open Library's series data is
 * sparse and inconsistent, so callers must let the user fix/fill the result by hand.
 */
export async function fetchSeriesRoster(name: string, signal?: AbortSignal): Promise<RosterVolume[]> {
	const q = name.trim();
	if (!q) return [];
	const url =
		`https://openlibrary.org/search.json?q=${encodeURIComponent(`series:"${q}"`)}` +
		`&fields=title,series&limit=40`;
	const res = await fetch(url, { signal });
	if (!res.ok) return [];
	return parseRosterResponse(await res.json());
}
