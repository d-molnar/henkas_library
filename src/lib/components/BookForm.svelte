<script lang="ts">
	import type { Book, Status } from '$lib/types';
	import { READING_STATUSES } from '$lib/types';
	import type { BookInput } from '$lib/db';
	import { t } from '$lib/i18n/index.svelte';
	import { lookupIsbn } from '$lib/openlibrary';
	import { normalizeIsbn, looksLikeIsbn } from '$lib/isbn';
	import { tags as tagStore, ensureTag } from '$lib/db';
	import TagPicker from './TagPicker.svelte';
	import BookCover from './BookCover.svelte';
	import { coverFor } from '$lib/covers';
	import Search from 'lucide-svelte/icons/search';
	import Loader from 'lucide-svelte/icons/loader-circle';

	let {
		initial,
		submitLabel = 'Add to shelf',
		onsubmit
	}: {
		initial?: Book;
		submitLabel?: string;
		onsubmit: (values: BookInput) => void;
	} = $props();

	// form fields
	let title = $state(initial?.title ?? '');
	let author = $state(initial?.author ?? '');
	let isbn = $state(initial?.isbn ?? '');
	let pages = $state(initial?.pages ? String(initial.pages) : '');
	let status = $state<Status>(initial?.status ?? 'to-read');
	let copies = $state(initial ? (initial.owned ? String(initial.copies) : '0') : '1');
	const isWish = $derived(Number(copies) === 0);
	let format = $state(initial && initial.owned ? (initial.format ?? '') : '');
	let price = $state(initial && initial.owned && initial.pricePaid != null ? String(initial.pricePaid) : '');
	let year = $state(initial?.year ? String(initial.year) : '');
	let publisher = $state(initial?.publisher ?? '');
	let coverImage = $state(initial?.coverImage);

	// Genres and labels are both tag references; split the book's tagIds by kind
	// once the tag store has loaded (so we know each id's kind).
	let genreIds = $state<string[]>([]);
	let labelIds = $state<string[]>([]);
	let splitDone = $state(false);
	$effect(() => {
		if (splitDone) return;
		const initialTags = initial?.tagIds ?? [];
		if (initialTags.length === 0) {
			splitDone = true;
			return;
		}
		if ($tagStore.length) {
			const kindById = new Map($tagStore.map((tg) => [tg.id, tg.kind]));
			genreIds = initialTags.filter((id) => kindById.get(id) === 'genre');
			labelIds = initialTags.filter((id) => kindById.get(id) !== 'genre');
			splitDone = true;
		}
	});

	let lookupState = $state<'idle' | 'loading' | 'notfound' | 'error'>('idle');
	const isbnValid = $derived(isbn.trim() === '' || looksLikeIsbn(isbn));

	async function doLookup() {
		if (!looksLikeIsbn(isbn)) {
			lookupState = 'error';
			return;
		}
		lookupState = 'loading';
		try {
			const r = await lookupIsbn(isbn);
			if (!r) {
				lookupState = 'notfound';
				return;
			}
			// pre-fill only empty fields so we don't clobber what the user typed
			if (r.title) title = r.title;
			if (r.author) author = r.author;
			if (r.pages) pages = String(r.pages);
			if (r.year) year = String(r.year);
			if (r.publisher && !publisher) publisher = r.publisher;
			if (r.genre && genreIds.length === 0) {
				const id = await ensureTag(r.genre, 'genre');
				if (!genreIds.includes(id)) genreIds = [...genreIds, id];
			}
			if (r.isbn) isbn = r.isbn;
			coverImage = r.coverImage;
			lookupState = 'idle';
		} catch {
			lookupState = 'error';
		}
	}

	const canSubmit = $derived(title.trim() !== '' && Number(pages) > 0 && isbnValid);

	// live cover preview (real cover once looked up, otherwise the gradient)
	const previewBook = $derived({
		title: title || 'Untitled',
		author: author || 'Unknown',
		cover: coverFor(title || 'x'),
		coverImage
	});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		const wish = Number(copies) === 0;
		onsubmit({
			title: title.trim(),
			author: author.trim() || 'Unknown',
			pages: Number(pages),
			status,
			currentPage: initial?.currentPage,
			copies: Math.max(0, Math.floor(Number(copies) || 0)),
			isbn: normalizeIsbn(isbn) ?? undefined,
			format: wish ? undefined : format.trim() || undefined,
			year: year ? Number(year) : undefined,
			publisher: publisher.trim() || undefined,
			pricePaid: wish ? undefined : price ? Number(price) : undefined,
			estValue: initial?.estValue,
			tagIds: [...genreIds, ...labelIds],
			coverImage
		});
	}
</script>

<form class="bookform" onsubmit={submit}>
	<!-- ISBN lookup row -->
	<div class="field">
		<label for="isbn">{t('form.isbn_label')}</label>
		<div class="isbn-row">
			<input
				id="isbn"
				class="input"
				class:invalid={!isbnValid}
				placeholder={t('form.isbn_placeholder')}
				bind:value={isbn}
				inputmode="numeric"
				autocomplete="off"
			/>
			<button
				type="button"
				class="btn btn-secondary"
				onclick={doLookup}
				disabled={lookupState === 'loading' || isbn.trim() === ''}
			>
				{#if lookupState === 'loading'}
					<Loader size={15} strokeWidth={2.4} class="spin" /> {t('form.looking')}
				{:else}
					<Search size={15} strokeWidth={2.4} /> {t('form.lookup')}
				{/if}
			</button>
		</div>
		{#if !isbnValid}
			<p class="hint err">{t('form.isbn_invalid')}</p>
		{:else if lookupState === 'notfound'}
			<p class="hint">{t('form.isbn_notfound')}</p>
		{:else if lookupState === 'error'}
			<p class="hint err">{t('form.isbn_error')}</p>
		{/if}
	</div>

	<div class="grid">
		<div class="cover-preview">
			<BookCover book={previewBook} size="md" />
		</div>

		<div class="fields">
			<div class="field">
				<label for="title">{t('form.title')}</label>
				<input id="title" class="input" bind:value={title} required />
			</div>
			<div class="field">
				<label for="author">{t('form.author')}</label>
				<input id="author" class="input" bind:value={author} />
			</div>
			<div class="two">
				<div class="field">
					<label for="pages">{t('form.pages')}</label>
					<input id="pages" class="input" type="number" min="1" bind:value={pages} required />
				</div>
				<div class="field">
					<label for="status">{t('form.status')}</label>
					<select id="status" class="input" bind:value={status}>
						{#each READING_STATUSES as s (s)}
							<option value={s}>{t(`status.${s}`)}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
	</div>

	<div class="two">
		<div class="field">
			<label for="copies">{t('form.copies')}</label>
			<input id="copies" class="input" type="number" min="0" bind:value={copies} />
			{#if isWish}
				<p class="hint">{t('form.copies_wishlist')}</p>
			{/if}
		</div>
		<div class="field">
			<span class="lbl">{t('form.genre')}</span>
			<TagPicker bind:ids={genreIds} kind="genre" placeholder={t('form.genre_ph')} />
		</div>
	</div>

	<div class="two">
		{#if !isWish}
			<div class="field">
				<label for="format">{t('form.format')}</label>
				<input id="format" class="input" bind:value={format} placeholder={t('form.format_ph')} />
			</div>
		{/if}
		<div class="field">
			<label for="year">{t('form.year')}</label>
			<input id="year" class="input" type="number" bind:value={year} placeholder="2015" />
		</div>
	</div>

	{#if !isWish}
		<div class="field">
			<label for="price">{t('form.price')}</label>
			<input id="price" class="input" type="number" step="0.01" bind:value={price} placeholder="€ 0.00" />
		</div>
	{/if}

	<div class="field">
		<span class="lbl">{t('form.tags')}</span>
		<TagPicker bind:ids={labelIds} kind="label" placeholder={t('tag.placeholder')} />
	</div>

	<div class="dialog-actions">
		<button type="submit" class="btn btn-primary" disabled={!canSubmit}>{submitLabel}</button>
	</div>
</form>

<style>
	.bookform {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.isbn-row {
		display: flex;
		gap: 8px;
	}
	.isbn-row .input {
		flex: 1;
	}
	.isbn-row .btn {
		white-space: nowrap;
	}
	.input.invalid {
		border-color: var(--color-accent-600);
	}
	.grid {
		display: grid;
		grid-template-columns: 96px 1fr;
		gap: var(--space-3);
		align-items: start;
	}
	.cover-preview {
		width: 96px;
	}
	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}
	.lbl {
		display: block;
		font-size: 12px;
		margin-bottom: 5px;
		color: color-mix(in srgb, var(--color-text) 70%, transparent);
	}
	.hint {
		margin: 5px 0 0;
		font-size: 12px;
		opacity: 0.65;
	}
	.hint.err {
		color: var(--color-accent-700);
		opacity: 1;
	}
	:global(.spin) {
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 480px) {
		.two {
			grid-template-columns: 1fr;
		}
	}
</style>
