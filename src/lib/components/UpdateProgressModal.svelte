<script lang="ts">
	import { bookById, updateProgress, markFinished, updateBook } from '$lib/db';
	import { closeModal } from '$lib/ui.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import Modal from './Modal.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import Minus from 'lucide-svelte/icons/minus';
	import Plus from 'lucide-svelte/icons/plus';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';

	let { bookId }: { bookId: string } = $props();

	const book = bookById(bookId);

	let page = $state(0);
	let note = $state('');
	let initialized = $state(false);

	// Seed the input from the book once it loads.
	$effect(() => {
		if ($book && !initialized) {
			page = $book.currentPage;
			initialized = true;
		}
	});

	const total = $derived($book?.pages ?? 0);
	const pct = $derived(total > 0 ? Math.round((page / total) * 100) : 0);
	const left = $derived(Math.max(0, total - page));

	function clamp(n: number) {
		page = Math.max(0, Math.min(n, total));
	}

	async function save() {
		await updateProgress(bookId, page);
		if (note.trim()) {
			// append the session note to the book's notes (rudimentary journal)
			const prev = $book?.notes ? $book.notes + '\n' : '';
			await updateBook(bookId, { notes: prev + `p.${page}: ${note.trim()}` });
		}
		closeModal();
	}
	async function finish() {
		await markFinished(bookId);
		closeModal();
	}
</script>

<Modal onclose={closeModal} width={520}>
	{#if $book}
		<div class="head">
			<div>
				<span class="dialog-title">{t('progress.title')}</span>
				<div class="sub">{$book.title} · {$book.author} · {total} pp</div>
			</div>
			<button class="btn btn-secondary btn-icon" aria-label="Close" onclick={closeModal}>
				<X size={14} strokeWidth={2.4} />
			</button>
		</div>

		<div class="stepper">
			<button class="btn btn-secondary btn-icon big" aria-label="-10" onclick={() => clamp(page - 10)}>
				<Minus size={18} strokeWidth={2.4} />
			</button>
			<div class="num">
				<input
					class="input"
					type="number"
					min="0"
					max={total}
					bind:value={page}
					oninput={() => clamp(page)}
				/>
				<div class="of">{t('progress.of_pages', { total })}</div>
			</div>
			<button class="btn btn-secondary btn-icon big" aria-label="+10" onclick={() => clamp(page + 10)}>
				<Plus size={18} strokeWidth={2.4} />
			</button>
		</div>

		<ProgressBar value={page} max={total} height={8} knob />
		<div class="pctline">
			<span>0</span>
			<span class="hi">{t('progress.left', { pct, n: left })}</span>
			<span>{total}</span>
		</div>

		<div class="quick">
			<button class="tag tag-neutral" onclick={() => clamp(page + 10)}>＋10</button>
			<button class="tag tag-neutral" onclick={() => clamp(page + 25)}>＋25</button>
			<button class="tag tag-neutral" onclick={() => clamp(page + 50)}>＋50</button>
		</div>

		<div class="field">
			<label for="note">{t('progress.session_note')}</label>
			<input id="note" class="input" bind:value={note} placeholder={t('progress.session_ph')} />
		</div>

		<div class="finish">
			<Check size={17} strokeWidth={2.4} color="var(--color-accent-2-700)" />
			<span>{t('progress.finished_hint')}</span>
			<button class="btn btn-secondary" onclick={finish}>{t('progress.mark_finished')}</button>
		</div>

		<div class="dialog-actions">
			<button class="btn btn-ghost" onclick={closeModal}>{t('progress.cancel')}</button>
			<button class="btn btn-primary" onclick={save}>{t('progress.save')}</button>
		</div>
	{/if}
</Modal>

<style>
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	.sub {
		font-size: 13px;
		opacity: 0.6;
		margin-top: 2px;
	}
	.btn-icon {
		width: 30px;
		height: 30px;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 14px;
		justify-content: center;
		padding: 6px 0;
	}
	.btn-icon.big {
		width: 44px;
		height: 44px;
	}
	.num {
		text-align: center;
	}
	.num .input {
		width: 120px;
		text-align: center;
		font-family: var(--font-heading);
		font-size: 30px;
		min-height: 56px;
	}
	.num .of {
		font-size: 11px;
		opacity: 0.5;
		margin-top: 2px;
	}
	.pctline {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		opacity: 0.55;
	}
	.pctline .hi {
		opacity: 1;
		font-weight: 600;
		font-size: 13px;
		color: var(--color-accent-700);
	}
	.quick {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.quick .tag {
		cursor: pointer;
		border: 0;
		font: inherit;
	}
	.finish {
		display: flex;
		gap: 10px;
		align-items: center;
		padding: 10px 12px;
		border-radius: 18px;
		background: var(--color-accent-2-100);
		font-size: 13px;
		color: var(--color-accent-2-800);
	}
	.finish span {
		flex: 1;
	}
</style>
