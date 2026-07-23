import type { Tag, TagKind } from './types';
import { db, live } from './db';

// ── Reactive collection ───────────────────────────────────────────────
export const tags = live<Tag[]>(() => db.tags.toArray(), []);

// ── Mutations ─────────────────────────────────────────────────────────
/** Find a tag by name+kind (case-insensitive), or create it. Returns its id. */
export async function ensureTag(name: string, kind: TagKind): Promise<string> {
	const trimmed = name.trim();
	const existing = (await db.tags.where('kind').equals(kind).toArray()).find(
		(t) => t.name.toLowerCase() === trimmed.toLowerCase()
	);
	if (existing) return existing.id;
	const id = crypto.randomUUID();
	await db.tags.add({ id, name: trimmed, kind });
	return id;
}

/** Rename a tag in one place — every book referencing it updates automatically. */
export async function renameTag(id: string, name: string) {
	await db.tags.update(id, { name: name.trim() });
}

export async function deleteTag(id: string) {
	await db.transaction('rw', db.tags, db.books, async () => {
		await db.tags.delete(id);
		// drop the reference from any book that had it
		const affected = await db.books.filter((b) => b.tagIds.includes(id)).toArray();
		await Promise.all(
			affected.map((b) => db.books.update(b.id, { tagIds: b.tagIds.filter((t) => t !== id) }))
		);
	});
}

/**
 * Merge `fromId` into `intoId`: every book referencing the source now references
 * the target (deduped), and the source tag is deleted. No-op if they're equal.
 */
export async function mergeTags(fromId: string, intoId: string) {
	if (fromId === intoId) return;
	await db.transaction('rw', db.tags, db.books, async () => {
		const affected = await db.books.filter((b) => b.tagIds.includes(fromId)).toArray();
		await Promise.all(
			affected.map((b) => {
				// swap fromId → intoId, then dedup while preserving order
				const tagIds = [...new Set(b.tagIds.map((t) => (t === fromId ? intoId : t)))];
				return db.books.update(b.id, { tagIds });
			})
		);
		await db.tags.delete(fromId);
	});
}
