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

<a class="bookcard" href="/book/{book.id}" title={book.title}>
	<div class="cover-wrap">
		<BookCover {book} size="md" />
		{#if book.owned && book.copies > 1}
			<span class="badge">×{book.copies}</span>
		{/if}
		{#if isWishlist(book)}
			<span class="badge wish">{t('status.wishlist')}</span>
		{/if}
		<!-- Reading progress rides on the cover so its presence never shifts the
		     rows below it — every card keeps the same element positions. -->
		{#if book.status === 'reading'}
			<div class="progress-strip">
				<ProgressBar value={book.currentPage} max={book.pages} height={4} />
			</div>
		{/if}
	</div>

	<div class="title">{book.title}</div>

	<div class="meta">
		{#if !book.owned}
			<span>{book.estValue ? t('common.unowned_price', { price: book.estValue }) : t('common.unowned')}</span>
		{:else if book.status === 'reading'}
			<span>p. {book.currentPage} / {book.pages}</span>
			<span>{pct}%</span>
		{:else if book.rating}
			<StarRating value={book.rating} readonly size={12} />
		{:else}
			<span class="dim">{book.author}</span>
		{/if}
	</div>
</a>

<style>
	.bookcard {
		display: flex;
		flex-direction: column;
		gap: 7px;
		text-decoration: none;
		color: inherit;
		/* Never let a long title widen the grid column — that would make this
		   card's cover bigger than its neighbours'. */
		min-width: 0;
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
	/* Sits on the artwork, so it carries its own scrim — an image cover may have
	   anything (often the author's name) under it. */
	.progress-strip {
		position: absolute;
		inset: auto 6px 6px;
		padding: 4px 6px;
		border-radius: 999px;
		background: color-mix(in srgb, #201e1d 55%, transparent);
	}
	/* Two fixed lines: a long title is clamped (full text in the tooltip) so it
	   can never push the card's meta row out of line with its neighbours'. */
	.title {
		font-weight: 600;
		font-size: 13px;
		line-height: 1.25;
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		min-height: calc(2 * 1.25em);
	}
	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 5px;
		font-size: 11px;
		opacity: 0.6;
		min-height: 1.55em; /* reserved even when empty — keeps rows aligned */
		overflow: hidden;
		white-space: nowrap;
	}
	/* Phone: the cover already carries author + a progress strip, so this line
	   is mostly a duplicate. Drop it and give the row back to the covers. */
	@media (max-width: 560px) {
		.meta {
			display: none;
		}
	}
	.meta .dim {
		opacity: 0.85;
	}
</style>
