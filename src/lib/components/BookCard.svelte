<script lang="ts">
	import type { Book } from '$lib/types';
	import { isWishlist } from '$lib/types';
	import { t } from '$lib/i18n/index.svelte';
	import BookCover from './BookCover.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import StarRating from './StarRating.svelte';

	let { book }: { book: Book } = $props();
	const pct = $derived(book.pages > 0 ? Math.round((book.currentPage / book.pages) * 100) : 0);
</script>

<a class="bookcard" href="/book/{book.id}">
	<div class="cover-wrap">
		<BookCover {book} size="md" />
		{#if book.owned && book.copies > 1}
			<span class="badge">×{book.copies}</span>
		{/if}
		{#if isWishlist(book)}
			<span class="badge wish">{t('status.wishlist')}</span>
		{/if}
	</div>

	{#if book.status === 'reading'}
		<ProgressBar value={book.currentPage} max={book.pages} />
	{/if}

	<div class="title">{book.title}</div>

	{#if !book.owned}
		<div class="meta">
			<span>{book.estValue ? t('common.unowned_price', { price: book.estValue }) : t('common.unowned')}</span>
		</div>
	{:else if book.status === 'reading'}
		<div class="meta">
			<span>p. {book.currentPage} / {book.pages}</span>
			<span>{pct}%</span>
		</div>
	{:else if book.rating}
		<div class="meta">
			<StarRating value={book.rating} readonly size={12} />
		</div>
	{:else}
		<div class="meta"><span class="dim">{book.author}</span></div>
	{/if}
</a>

<style>
	.bookcard {
		display: flex;
		flex-direction: column;
		gap: 7px;
		text-decoration: none;
		color: inherit;
	}
	.cover-wrap {
		position: relative;
		transition: transform 0.12s ease;
	}
	.bookcard:hover .cover-wrap {
		transform: translateY(-3px);
	}
	.badge {
		position: absolute;
		top: 8px;
		right: 8px;
		background: var(--color-bg);
		color: var(--color-neutral-700);
		border-radius: 999px;
		font-weight: 600;
		font-size: 10px;
		padding: 2px 8px;
	}
	.badge.wish {
		color: var(--color-accent-700);
	}
	.title {
		font-weight: 600;
		font-size: 13px;
		line-height: 1.25;
	}
	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 5px;
		font-size: 11px;
		opacity: 0.6;
	}
	.meta .dim {
		opacity: 0.85;
	}
</style>
