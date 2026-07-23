/** Global modal state — any screen can open the add-book or update-progress sheets. */
type Modal =
	| { kind: 'none' }
	| { kind: 'add' }
	| { kind: 'progress'; bookId: string }
	| { kind: 'lend'; bookId: string };

export const ui = $state<{ modal: Modal }>({ modal: { kind: 'none' } });

export function openAdd() {
	ui.modal = { kind: 'add' };
}
export function openProgress(bookId: string) {
	ui.modal = { kind: 'progress', bookId };
}
export function openLend(bookId: string) {
	ui.modal = { kind: 'lend', bookId };
}
export function closeModal() {
	ui.modal = { kind: 'none' };
}
