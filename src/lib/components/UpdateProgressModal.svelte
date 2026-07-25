<script lang="ts">
	import { bookById, updateProgress, markFinished, updateBook } from '$lib/books';
	import { closeModal } from '$lib/ui.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import Modal from './Modal.svelte';
	import ProgressBar from './ProgressBar.svelte';
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

	/** Two step sizes per side; anything bigger is a drag on the bar below. */
	const STEPS = [1, 10] as const;

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
			{#each [...STEPS].reverse() as n (n)}
				<button
					class="step"
					class:one={n === 1}
					aria-label={t('progress.back_n', { n })}
					onclick={() => step(-n)}
				>
					{n === 1 ? '−' : `−${n}`}
				</button>
			{/each}

			<input
				class="input num"
				type="number"
				inputmode="numeric"
				min="0"
				max={total}
				bind:value={page}
				oninput={() => clamp(page)}
			/>

			{#each STEPS as n (n)}
				<button
					class="step"
					class:one={n === 1}
					aria-label={t('progress.fwd_n', { n })}
					onclick={() => step(n)}
				>
					{n === 1 ? '+' : `+${n}`}
				</button>
			{/each}
		</div>
		<div class="of">{t('progress.of_pages', { total })}</div>

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
	/* One control, not seven: the steps and the page field share a single
	   rounded outline, divided by hairlines. */
	.stepper {
		display: flex;
		align-items: stretch;
		border: 1px solid var(--color-divider);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		overflow: hidden;
	}
	.step {
		flex: 1 1 0;
		min-width: 0;
		padding: 0;
		border: 0;
		border-right: 1px solid var(--color-divider);
		background: none;
		color: inherit;
		font-family: var(--font-heading);
		font-size: 15px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition: background 0.12s ease;
		/* Rapid taps were landing as +1, +2, +2: while double-tap-to-zoom is armed
		   the browser replays a compatibility click on the 2nd and 3rd tap of the
		   gesture. manipulation opts the button out of double-tap (and its 300ms
		   delay); no-select keeps a fast burst from selecting the label. */
		touch-action: manipulation;
		user-select: none;
		-webkit-user-select: none;
	}
	/* the bare +/− carries the same ink as "+10" at this size */
	.step.one {
		font-size: 24px;
	}
	.step:last-child {
		border-right: 0;
	}
	.step:hover {
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}
	.step:active {
		background: color-mix(in srgb, var(--color-accent) 20%, transparent);
	}
	/* Same flex basis as a step, 1.5× the share — the field reads as the centre
	   of the group at any dialog width without starving the tap targets. */
	.num {
		flex: 1.5 1 0;
		width: auto;
		min-width: 0;
		min-height: 56px;
		text-align: center;
		font-family: var(--font-heading);
		font-size: 24px;
		/* the field is a segment of the group — no outline of its own */
		border: 0;
		border-right: 1px solid var(--color-divider);
		border-radius: 0;
		background: none;
		/* no spinners: the steps are the affordance here */
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.num::-webkit-outer-spin-button,
	.num::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
	}
	.num:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}
	.of {
		text-align: center;
		font-size: 11px;
		opacity: 0.5;
		margin-top: -6px;
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
