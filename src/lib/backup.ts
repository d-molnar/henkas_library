import { db } from './db';

/** Export the whole library as a JSON blob (backup). */
export async function exportBackup(): Promise<string> {
	const [b, s, l] = await Promise.all([db.books.toArray(), db.series.toArray(), db.loans.toArray()]);
	return JSON.stringify({ version: 1, exportedAt: Date.now(), books: b, series: s, loans: l }, null, 2);
}

export async function importBackup(json: string) {
	const data = JSON.parse(json);
	await db.transaction('rw', db.books, db.series, db.loans, async () => {
		await Promise.all([db.books.clear(), db.series.clear(), db.loans.clear()]);
		await db.books.bulkAdd(data.books ?? []);
		await db.series.bulkAdd(data.series ?? []);
		await db.loans.bulkAdd(data.loans ?? []);
	});
}
