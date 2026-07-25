<script lang="ts">
	import { books } from '$lib/books';
	import { series, seriesEntries, deriveSeriesProgress } from '$lib/series';
	import { t } from '$lib/i18n/index.svelte';
	import SeriesCard from '$lib/components/SeriesCard.svelte';

	// All counting lives in the derivation — the component only renders it.
	const progress = $derived(
		deriveSeriesProgress($series, $seriesEntries, $books).sort((a, b) =>
			a.series.name.localeCompare(b.series.name)
		)
	);
</script>

<div class="head">
	<h1>{t('series.title')}</h1>
	{#if progress.length}
		<span class="text-muted">{t('series.count', { count: progress.length })}</span>
	{/if}
</div>

{#if progress.length === 0}
	<p class="text-muted empty">{t('series.empty')}</p>
{:else}
	<div class="grid">
		{#each progress as p (p.series.id)}
			<SeriesCard progress={p} />
		{/each}
	</div>
{/if}

<style>
	.head {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}
	.empty {
		padding: var(--space-8) 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4);
	}
	@media (max-width: 640px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
