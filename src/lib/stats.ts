import type { Book, Loan, OwnedBook, Tag } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface LibraryStats {
	finishedThisYear: number;
	pagesThisYear: number;
	streakDays: number;
	perMonth: { label: string; count: number; current: boolean }[];
	collectionValue: number;
	totalCopies: number;
	avgPaid: number;
	valueVsPaid: number;
	pricedCount: number;
	topGenres: { name: string; count: number }[];
}

export function deriveStats(books: Book[], _loans: Loan[], tags: Tag[], now = new Date()): LibraryStats {
	const year = now.getFullYear();
	const owned = books.filter((b): b is OwnedBook => b.owned);

	const finishedThisYear = books.filter(
		(b) => b.finishedAt && new Date(b.finishedAt).getFullYear() === year
	);
	const pagesThisYear = finishedThisYear.reduce((n, b) => n + b.pages, 0);

	// Books finished per month, Jan..current month
	const monthsSoFar = now.getMonth();
	const perMonth = [];
	for (let m = 0; m <= monthsSoFar; m++) {
		const count = finishedThisYear.filter((b) => new Date(b.finishedAt!).getMonth() === m).length;
		perMonth.push({ label: MONTHS[m], count, current: m === monthsSoFar });
	}

	const priced = owned.filter((b) => typeof b.pricePaid === 'number');
	const totalPaid = priced.reduce((n, b) => n + (b.pricePaid ?? 0) * b.copies, 0);
	const collectionValue = owned.reduce(
		(n, b) => n + (b.estValue ?? b.pricePaid ?? 0) * b.copies,
		0
	);
	const totalCopies = owned.reduce((n, b) => n + b.copies, 0);
	const valued = owned.filter((b) => typeof b.estValue === 'number' || typeof b.pricePaid === 'number');
	const valueOfPriced = priced.reduce((n, b) => n + (b.estValue ?? b.pricePaid ?? 0) * b.copies, 0);

	const genreNameById = new Map(tags.filter((t) => t.kind === 'genre').map((t) => [t.id, t.name]));
	const genreCounts = new Map<string, number>();
	for (const b of owned) {
		for (const tid of b.tagIds) {
			const name = genreNameById.get(tid);
			if (name) genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1);
		}
	}
	const topGenres = [...genreCounts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 4);

	return {
		finishedThisYear: finishedThisYear.length,
		pagesThisYear,
		streakDays: 18, // reading-session streak — placeholder until sessions are logged
		perMonth,
		collectionValue: Math.round(collectionValue),
		totalCopies,
		avgPaid: priced.length ? totalPaid / priced.length : 0,
		valueVsPaid: Math.round(valueOfPriced - totalPaid),
		pricedCount: priced.length,
		topGenres
	};
}
