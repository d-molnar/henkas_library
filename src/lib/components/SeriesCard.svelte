<script lang="ts">
	import type { SeriesProgress, EntrySlot } from '$lib/series';
	import { coverGradient, coverFor } from '$lib/covers';
	import { t } from '$lib/i18n/index.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import Check from 'lucide-svelte/icons/check';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';

	let { progress }: { progress: SeriesProgress } = $props();

	let open = $state(false);

	// A slot's spine takes the cover of the book that provides it; unowned slots
	// fall back to a tinted-down palette derived from the canonical title.
	const spineStyle = (slot: EntrySlot) =>
		slot.books.length
			? coverGradient(slot.books[0].cover)
			: coverGradient(coverFor(slot.entry.title));

	const stateKey = (slot: EntrySlot) =>
		slot.acquisition.kind === 'have'
			? ('series.vol_owned' as const)
			: slot.acquisition.kind === 'wanted'
				? ('series.vol_wanted' as const)
				: ('series.vol_missing' as const);
</script>

<article class="card seriescard">
	<div class="spines" aria-hidden="true">
		{#each progress.entries as slot (slot.entry.id)}
			<span
				class="spine"
				class:missing={slot.acquisition.kind === 'missing'}
				class:wanted={slot.acquisition.kind === 'wanted'}
				style:background={spineStyle(slot)}
				title={slot.entry.title}
			>
				<b style:color={slot.books[0]?.cover.ink}>{slot.entry.label}</b>
			</span>
		{/each}
	</div>

	<div class="head">
		<span class="card-kicker">{progress.series.author}</span>
		<h3 class="card-title">{progress.series.name}</h3>
	</div>

	<ProgressBar
		value={progress.ownedCount}
		max={progress.available}
		height={6}
		color="var(--color-accent-2)"
		label={t('series.progress_aria')}
	/>
	<div class="counts">
		{t('series.counts', {
			owned: progress.ownedCount,
			available: progress.available,
			read: progress.readCount
		})}
	</div>

	<div class="chips">
		{#if progress.nextToRead}
			<span class="tag tag-accent-2">
				{t('series.next', { title: progress.nextToRead.entry.title })}
			</span>
		{/if}
		{#if progress.missingCount > 0}
			<span class="tag tag-outline">{t('series.missing', { count: progress.missingCount })}</span>
		{:else}
			<span class="tag tag-neutral">{t('series.complete')}</span>
		{/if}
	</div>

	<button type="button" class="btn btn-ghost toggle" onclick={() => (open = !open)}>
		<ChevronDown size={14} strokeWidth={2.4} class={open ? 'flip' : undefined} />
		{open ? t('series.hide_volumes') : t('series.volumes')}
	</button>

	{#if open}
		<ul class="volumes">
			{#each progress.entries as slot (slot.entry.id)}
				<li class:missing={slot.acquisition.kind === 'missing'}>
					<span class="label">{slot.entry.label}</span>
					{#if slot.books.length}
						<a class="vtitle" href="/book/{slot.books[0].id}">{slot.entry.title}</a>
					{:else}
						<span class="vtitle">{slot.entry.title}</span>
					{/if}
					{#if slot.read}
						<span class="read" title={t('series.vol_read')}>
							<Check size={13} strokeWidth={3} />
						</span>
					{/if}
					<span class="state">{t(stateKey(slot))}</span>
				</li>
			{/each}
		</ul>
	{/if}
</article>

<style>
	.seriescard {
		gap: var(--space-2);
	}
	/* Leaning stack of volume spines, one per canonical entry. */
	.spines {
		display: flex;
		align-items: flex-end;
		padding: var(--space-3) var(--space-2) var(--space-2);
		min-height: 96px;
	}
	.spine {
		width: 20px;
		height: 72px;
		margin-right: -2px;
		border-radius: 3px;
		transform: rotate(-4deg);
		transform-origin: bottom center;
		box-shadow: 0 2px 6px color-mix(in srgb, #2e2b25 22%, transparent);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 5px;
		flex-shrink: 0;
	}
	.spine b {
		font-size: 9px;
		font-weight: 700;
		color: var(--color-neutral-100);
		opacity: 0.85;
	}
	.spine.wanted {
		opacity: 0.5;
	}
	.spine.missing {
		background: none !important;
		border: 1px dashed color-mix(in srgb, var(--color-text) 35%, transparent);
		box-shadow: none;
		height: 62px;
	}
	.spine.missing b {
		color: color-mix(in srgb, var(--color-text) 55%, transparent);
	}
	.head {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.counts {
		font-size: 12px;
		color: color-mix(in srgb, var(--color-text) 60%, transparent);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.toggle {
		align-self: flex-start;
		font-size: 12px;
		gap: 4px;
	}
	.toggle :global(.flip) {
		transform: rotate(180deg);
	}
	.volumes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
		font-size: 13px;
	}
	.volumes li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 5px var(--space-2);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-bg) 55%, transparent);
	}
	.volumes li.missing {
		opacity: 0.6;
	}
	.label {
		min-width: 22px;
		font-size: 11px;
		font-weight: 700;
		color: color-mix(in srgb, var(--color-text) 50%, transparent);
	}
	.vtitle {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	a.vtitle {
		color: inherit;
		text-decoration: none;
	}
	a.vtitle:hover {
		color: var(--color-accent);
		text-decoration: underline;
	}
	.read {
		display: inline-flex;
		color: var(--color-accent-2);
	}
	.state {
		font-size: 10px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-text) 45%, transparent);
		white-space: nowrap;
	}
</style>
