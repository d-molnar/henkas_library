<script lang="ts">
	import { books } from '$lib/books';
	import { tags as tagStore } from '$lib/tags';
	import { openAdd } from '$lib/ui.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { Book, Status } from '$lib/types';
	import { READING_STATUSES, isWishlist } from '$lib/types';
	import BookCard from '$lib/components/BookCard.svelte';
	import Search from 'lucide-svelte/icons/search';
	import Plus from 'lucide-svelte/icons/plus';

	// Wishlist is its own axis (owned === false), not a reading status.
	type Filter = Status | 'all' | 'wishlist';
	let query = $state('');
	let filter = $state<Filter>('all');

	const q = $derived(query.trim().toLowerCase());
	const tagNameById = $derived(new Map($tagStore.map((tg) => [tg.id, tg.name.toLowerCase()])));

	const matches = $derived(
		(b: Book) =>
			q === '' ||
			b.title.toLowerCase().includes(q) ||
			b.author.toLowerCase().includes(q) ||
			(b.isbn ?? '').includes(q) ||
			b.tagIds.some((tid) => (tagNameById.get(tid) ?? '').includes(q))
	);

	function inFilter(b: Book): boolean {
		if (filter === 'all') return true;
		if (filter === 'wishlist') return isWishlist(b);
		return !isWishlist(b) && b.status === filter;
	}

	const filtered = $derived($books.filter((b) => matches(b) && inFilter(b)));

	// Books group by reading status; wishlist items are their own section last.
	const sectionDefs = $derived([
		{ key: 'reading', label: t('section.reading'), pred: (b: Book) => !isWishlist(b) && b.status === 'reading' },
		{ key: 'to-read', label: t('status.to-read'), pred: (b: Book) => !isWishlist(b) && b.status === 'to-read' },
		{ key: 'completed', label: t('status.completed'), pred: (b: Book) => !isWishlist(b) && b.status === 'completed' },
		{ key: 'wont-read', label: t('status.wont-read'), pred: (b: Book) => !isWishlist(b) && b.status === 'wont-read' },
		{ key: 'wishlist', label: t('status.wishlist'), pred: (b: Book) => isWishlist(b) }
	]);
	const sections = $derived(
		sectionDefs
			.map((d) => ({ ...d, items: filtered.filter(d.pred).sort((a, b) => b.addedAt - a.addedAt) }))
			.filter((s) => s.items.length > 0)
	);

	const statusCount = $derived(
		(s: Status) => $books.filter((b) => !isWishlist(b) && b.status === s).length
	);
	const wishlistCount = $derived($books.filter(isWishlist).length);
</script>

<div class="shelf-head">
	<div class="shelf-top">
		<div class="searchbar">
			<Search size={16} strokeWidth={2.2} class="search-ico" />
			<input class="input search" placeholder={t('shelf.search')} bind:value={query} />
		</div>
		<button class="btn btn-primary add" aria-label={t('nav.add')} onclick={openAdd}>
			<Plus size={16} strokeWidth={2.6} />
			<span>{t('nav.add')}</span>
		</button>
	</div>
	<div class="filters">
		<button class="tag" class:active={filter === 'all'} onclick={() => (filter = 'all')}>
			{t('shelf.all')} · {$books.length}
		</button>
		{#each READING_STATUSES as s (s)}
			{#if statusCount(s)}
				<button class="tag" class:active={filter === s} onclick={() => (filter = s)}>
					{t(`status.${s}`)} · {statusCount(s)}
				</button>
			{/if}
		{/each}
		{#if wishlistCount}
			<button
				class="tag"
				class:active={filter === 'wishlist'}
				onclick={() => (filter = 'wishlist')}
			>
				{t('status.wishlist')} · {wishlistCount}
			</button>
		{/if}
	</div>
</div>

{#if $books.length === 0}
	<div class="empty">
		<h2>{t('shelf.empty_title')}</h2>
		<p class="text-muted">{t('shelf.empty_body')}</p>
		<button class="btn btn-primary" onclick={openAdd}>
			<Plus size={16} strokeWidth={2.6} /> {t('shelf.empty_cta')}
		</button>
	</div>
{:else if sections.length === 0}
	<p class="text-muted no-results">{t('shelf.no_results', { q: query })}</p>
{:else}
	{#each sections as section (section.key)}
		<section class="group">
			<div class="section-head">
				<h4>{section.label}</h4>
				<span class="count">{t('shelf.count', { count: section.items.length })}</span>
			</div>
			<div class="grid">
				{#each section.items as book (book.id)}
					<BookCard {book} />
				{/each}
			</div>
		</section>
	{/each}
{/if}

<style>
	.shelf-head {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: var(--space-6);
	}
	.shelf-top {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.searchbar {
		position: relative;
		flex: 1;
		min-width: 0;
		max-width: 420px;
	}
	.add {
		flex-shrink: 0;
		white-space: nowrap;
	}
	/* Phone: the label would crowd the search field — keep just the + glyph. */
	@media (max-width: 560px) {
		.add span {
			display: none;
		}
		.add {
			width: 44px;
			height: 44px;
			padding: 0;
			justify-content: center;
		}
	}
	.searchbar :global(.search-ico) {
		position: absolute;
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
		opacity: 0.5;
		pointer-events: none;
	}
	.search {
		padding-left: 38px;
	}
	.filters {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.filters .tag {
		cursor: pointer;
		border: 1px solid var(--color-divider);
		background: transparent;
		font: inherit;
		font-size: 12px;
		color: inherit;
		padding: 4px 12px;
	}
	.filters .tag:hover {
		border-color: var(--color-accent);
	}
	.filters .tag.active {
		background: var(--color-accent);
		color: var(--color-bg);
		border-color: var(--color-accent);
	}
	.group {
		margin-bottom: var(--space-8);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		align-items: start;
		gap: 18px;
	}
	@media (max-width: 900px) {
		.grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
	@media (max-width: 560px) {
		.grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 12px;
		}
	}
	.empty {
		text-align: center;
		padding: calc(var(--space-8) * 1.5) 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.empty .btn {
		margin-top: 8px;
	}
	.no-results {
		padding: var(--space-8) 0;
	}
</style>
