<script lang="ts">
	// Phone-side home for everything that isn't a shelf/series/tags screen. The
	// deferred settings-ish screens (stats & sync, lending, backup) land here as
	// rows when they ship, instead of growing the tab bar.
	import { t, i18n, setLocale, LOCALES, type LocaleCode } from '$lib/i18n/index.svelte';
	import Languages from 'lucide-svelte/icons/languages';
</script>

<div class="head">
	<h1>{t('more.title')}</h1>
</div>

<ul class="rows">
	<li>
		<span class="ico"><Languages size={18} strokeWidth={2.2} /></span>
		<label class="row-label" for="locale">{t('app.language')}</label>
		<select
			id="locale"
			value={i18n.locale}
			onchange={(e) => setLocale(e.currentTarget.value as LocaleCode)}
		>
			{#each LOCALES as l (l.code)}
				<option value={l.code}>{l.name}</option>
			{/each}
		</select>
	</li>
</ul>

<style>
	.head {
		margin-bottom: var(--space-6);
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.rows li {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 52px;
		padding: var(--space-2) var(--space-3);
		background: var(--color-surface);
		border-radius: var(--radius-md);
	}
	.ico {
		display: inline-flex;
		color: var(--color-accent);
	}
	.row-label {
		flex: 1;
		min-width: 0;
	}
	select {
		font: inherit;
		font-size: 15px;
		color: inherit;
		background: var(--color-bg);
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		padding: 8px 12px;
		cursor: pointer;
	}
	select:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
