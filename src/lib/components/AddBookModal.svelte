<script lang="ts">
	import type { Book } from '$lib/types';
	import type { BookInput } from '$lib/db';
	import { addBook, addCopy, findByIsbn } from '$lib/db';
	import { closeModal } from '$lib/ui.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import Modal from './Modal.svelte';
	import BookForm from './BookForm.svelte';
	import X from 'lucide-svelte/icons/x';

	// When an ISBN already exists we pause on a confirmation step.
	let dup = $state<{ existing: Book; values: BookInput } | null>(null);

	async function handleSubmit(values: BookInput) {
		if (values.isbn) {
			const existing = await findByIsbn(values.isbn);
			if (existing) {
				dup = { existing, values };
				return;
			}
		}
		await addBook(values);
		closeModal();
	}

	async function addAsCopy() {
		if (dup) await addCopy(dup.existing.id);
		closeModal();
	}
	async function addAnyway() {
		if (dup) await addBook(dup.values);
		closeModal();
	}
</script>

<Modal onclose={closeModal} width={640}>
	{#if dup}
		<div class="row spacer-row">
			<span class="dialog-title">{t('dup.title')}</span>
		</div>
		<p class="dialog-body">{t('dup.body', { title: dup.existing.title })}</p>
		<div class="dialog-actions">
			<button class="btn btn-ghost" onclick={() => (dup = null)}>{t('dup.cancel')}</button>
			<button class="btn btn-secondary" onclick={addAnyway}>{t('dup.add_anyway')}</button>
			<button class="btn btn-primary" onclick={addAsCopy}>{t('dup.add_copy')}</button>
		</div>
	{:else}
		<div class="head">
			<span class="dialog-title">{t('add.title')}</span>
			<button class="btn btn-secondary btn-icon" aria-label="Close" onclick={closeModal}>
				<X size={14} strokeWidth={2.4} />
			</button>
		</div>
		<BookForm submitLabel={t('form.add_submit')} onsubmit={handleSubmit} />
	{/if}
</Modal>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.btn-icon {
		width: 30px;
		height: 30px;
	}
</style>
