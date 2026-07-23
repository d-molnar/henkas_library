import type { Loan } from './types';
import { db, live } from './db';

// ── Reactive collections ──────────────────────────────────────────────
export const loans = live<Loan[]>(() => db.loans.toArray(), []);
export const activeLoans = live<Loan[]>(
	() => db.loans.filter((l) => l.returnedAt == null).toArray(),
	[]
);

// ── Mutations ─────────────────────────────────────────────────────────
export async function lendBook(
	bookId: string,
	loan: Omit<Loan, 'id' | 'bookId' | 'since' | 'returnedAt'> & { since?: number }
) {
	await db.loans.add({
		id: crypto.randomUUID(),
		bookId,
		since: loan.since ?? Date.now(),
		returnedAt: null,
		...loan
	});
}

export async function returnLoan(loanId: string) {
	await db.loans.update(loanId, { returnedAt: Date.now() });
}
