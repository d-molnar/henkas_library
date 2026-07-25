<script lang="ts">
	import { bookById, updateProgress, markFinished, updateBook } from '$lib/books';
	import { closeModal } from '$lib/ui.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import Modal from './Modal.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
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

	/** Three step sizes per side: one page, ten, fifty. */
	const STEPS = [1, 10, 50] as const;

	function clamp(n: number) {
		page = Math.max(0, Math.min(n, total));
	}
	function step(delta: number) {
		clamp((Number.isFinite(page) ? page : 0) + delta);
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
			<button class="btn btn-secondary btn-icon" aria-label={t('common.close')} onclick={closeModal}>
				<X size={14} strokeWidth={2.4} />
			</button>
		</div>

		<div class="stepper">
			{#each [...STEPS].reverse() as n, i (n)}
				<button
					class="step"
					aria-label={t('progress.back_n', { n })}
					onclick={() => step(-n)}
				>
					<span class="chevrons">
						{#each { length: STEPS.length - i } as _, c (c)}
							<ChevronLeft size={16} strokeWidth={2.6} />
						{/each}
					</span>
					<span class="delta">−{n}</span>
				</button>
			{/each}

			<div class="num">
				<input
					class="input"
					type="number"
					inputmode="numeric"
					min="0"
					max={total}
					bind:value={page}
					oninput={() => clamp(page)}
				/>
				<div class="of">{t('progress.of_pages', { total })}</div>
			</div>

			{#each STEPS as n, i (n)}
				<button
					class="step"
					aria-label={t('progress.fwd_n', { n })}
					onclick={() => step(n)}
				>
					<span class="chevrons">
						{#each { length: i + 1 } as _, c (c)}
							<ChevronRight size={16} strokeWidth={2.6} />
						{/each}
					</span>
					<span class="delta">+{n}</span>
				</button>
			{/each}
		</div>

		<ProgressBar
			value={page}
			max={total}
			height={8}
			knob
			label={t('progress.seek')}
			onseek={clamp}
		/>
		<div class="pctline">
			<span>0</span>
			<span class="hi">{t('progress.left', { pct, n: left })}</span>
			<span>{total}</span>
		</div>

		<div class="field">
			<label for="note">{t('progress.session_note')}</label>
			<input id="note" class="input" bind:value={note} placeholder={t('progress.session_ph')} />
			<span class="hint">{t('progress.session_hint', { page })}</span>
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
		align-items: flex-start;
		gap: 2px;
		justify-content: center;
		padding: 6px 0;
	}
	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		border-radius: var(--radius-sm);
		/* the arrows sit on the number's line; the delta label hangs below */
		padding-top: 14px;
	}
	.step:hover .chevrons {
		color: var(--color-accent);
	}
	.step:active .chevrons {
		transform: scale(0.92);
	}
	.chevrons {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 34px;
		height: 34px;
		opacity: 0.85;
		transition: color 0.12s ease;
	}
	/* overlap the glyphs so «« reads as one control, not two arrows */
	.chevrons > :global(svg:not(:last-child)) {
		margin-right: -7px;
	}
	.delta {
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		opacity: 0.45;
	}
	.num {
		text-align: center;
		margin: 0 6px;
	}
	.num .input {
		width: 96px;
		text-align: center;
		font-family: var(--font-heading);
		font-size: 30px;
		min-height: 56px;
		/* no spinners: the arrow steps are the affordance here */
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.num .input::-webkit-outer-spin-button,
	.num .input::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
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
	.hint {
		display: block;
		margin-top: 5px;
		font-size: 11px;
		opacity: 0.5;
	}
	.finish {
		display: flex;
		gap: 10px;
		align-items: center;
		padding: 10px 12px;
		border-radius: var(--radius-md);
		background: var(--color-accent-2-100);
		font-size: 13px;
		color: var(--color-accent-2-800);
	}
	.finish span {
		flex: 1;
	}
</style>
