/**
 * ISBN utilities. We store a normalized ISBN-13 (digits only) as an optional,
 * indexed attribute — never as identity. See notes in db.ts.
 */

/** Strip everything but digits and a trailing X (ISBN-10 check char). */
function clean(raw: string): string {
	return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function isValidIsbn10(raw: string): boolean {
	const s = clean(raw);
	if (!/^\d{9}[\dX]$/.test(s)) return false;
	let sum = 0;
	for (let i = 0; i < 10; i++) {
		const c = s[i] === 'X' ? 10 : Number(s[i]);
		sum += c * (10 - i);
	}
	return sum % 11 === 0;
}

export function isValidIsbn13(raw: string): boolean {
	const s = clean(raw);
	if (!/^\d{13}$/.test(s)) return false;
	let sum = 0;
	for (let i = 0; i < 13; i++) {
		sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
	}
	return sum % 10 === 0;
}

function isbn10to13(raw: string): string {
	const core = '978' + clean(raw).slice(0, 9);
	let sum = 0;
	for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
	const check = (10 - (sum % 10)) % 10;
	return core + check;
}

/** Returns a normalized ISBN-13 (digits only), or null if the input isn't a valid ISBN. */
export function normalizeIsbn(raw: string | undefined | null): string | null {
	if (!raw) return null;
	const s = clean(raw);
	if (s.length === 13 && isValidIsbn13(s)) return s;
	if (s.length === 10 && isValidIsbn10(s)) return isbn10to13(s);
	return null;
}

/** True when the string could still become a valid ISBN as the user types (10/13 digits). */
export function looksLikeIsbn(raw: string): boolean {
	return normalizeIsbn(raw) !== null;
}

/** Pretty ISBN-13 with hyphens for display (best-effort grouping). */
export function formatIsbn13(isbn13: string): string {
	const s = clean(isbn13);
	if (s.length !== 13) return isbn13;
	return `${s.slice(0, 3)}-${s.slice(3, 4)}-${s.slice(4, 9)}-${s.slice(9, 12)}-${s.slice(12)}`;
}
