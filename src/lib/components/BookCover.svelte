<script lang="ts">
	import type { Book } from '$lib/types';
	import { coverGradient } from '$lib/covers';

	let {
		book,
		size = 'md'
	}: { book: Pick<Book, 'title' | 'author' | 'cover' | 'coverImage'>; size?: 'sm' | 'md' | 'lg' } =
		$props();

	const pad = { sm: '10px', md: '14px', lg: '24px' };
	const titleSize = { sm: '12px', md: '17px', lg: '30px' };
	const authorSize = { sm: '9px', md: '11px', lg: '14px' };
	const radius = { sm: '8px', md: '10px', lg: '14px' };
</script>

<div
	class="cover"
	style:background={book.coverImage ? undefined : coverGradient(book.cover)}
	style:--pad={pad[size]}
	style:--radius={radius[size]}
	style:color={book.cover.ink}
>
	{#if book.coverImage}
		<img
			src={book.coverImage}
			alt=""
			loading="lazy"
			onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
		/>
	{/if}
	{#if !book.coverImage}
		<span class="t" style:font-size={titleSize[size]}>{book.title}</span>
		<span class="a" style:font-size={authorSize[size]} style:color={book.cover.sub}>{book.author}</span>
	{/if}
</div>

<style>
	.cover {
		position: relative;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius);
		box-shadow: 0 3px 10px color-mix(in srgb, #2e2b25 25%, transparent);
		padding: var(--pad);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		overflow: hidden;
	}
	.cover img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.t {
		font-family: var(--font-heading);
		line-height: 1.15;
	}
	.a {
		font-family: var(--font-body);
	}
</style>
