<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { Book } from '$lib/types';
	import { READING_STATUSES } from '$lib/types';
	import type { BookInput } from '$lib/books';
	import {
		bookById,
		setStatus,
		setRating,
		updateBook,
		addCopy,
		deleteBook,
		saveBookEdits
	} from '$lib/books';
	import { openProgress } from '$lib/ui.svelte';
	import { tags as tagStore } from '$lib/tags';
	import { t, formatDate } from '$lib/i18n/index.svelte';
	import BookCover from '$lib/components/BookCover.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import TagPicker from '$lib/components/TagPicker.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import BookForm from '$lib/components/BookForm.svelte';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Plus from 'lucide-svelte/icons/plus';

	const id = $derived(page.params.id ?? '');
	let bookStore = $derived(bookById(id));
	const book = $derived($bookStore as Book | undefined);

	// local editable copies, synced when the book loads/changes
	let genreIds = $state<string[]>([]);
	let labelIds = $state<string[]>([]);
	let editingNote = $state(false);
	let noteDraft = $state('');
	let showEdit = $state(false);
	let lastId = $state('');

	// resolve the book's tagIds into genre vs label buckets (needs the tag store)
	const kindById = $derived(new Map($tagStore.map((tg) => [tg.id, tg.kind])));

	$effect(() => {
		// wait for the tag store before splitting, so kinds resolve correctly
		if (book && book.id !== lastId && (book.tagIds.length === 0 || kindById.size > 0)) {
			genreIds = book.tagIds.filter((tid) => kindById.get(tid) === 'genre');
			labelIds = book.tagIds.filter((tid) => kindById.get(tid) !== 'genre');
			noteDraft = book.notes ?? '';
			lastId = book.id;
		}
	});

	function persistTags() {
		updateBook(id, { tagIds: [...genreIds, ...labelIds] });
	}

	const pct = $derived(book && book.pages > 0 ? Math.round((book.currentPage / book.pages) * 100) : 0);

	function saveNote() {
		updateBook(id, { notes: noteDraft.trim() || undefined });
		editingNote = false;
	}

	async function remove() {
		if (!book) return;
		if (confirm(t('detail.delete_confirm', { title: book.title }))) {
			await deleteBook(id);
			goto('/');
		}
	}

	function saveEdit(values: BookInput) {
		saveBookEdits(id, values);
		showEdit = false;
	}
</script>

{#if !book}
	<p class="text-muted">{t('detail.not_found')}</p>
	<a href="/" class="btn btn-secondary" style="margin-top:12px">{t('detail.back')}</a>
{:else}
	<div class="topbar">
		<a href="/" class="back">
			<ArrowLeft size={16} strokeWidth={2.4} />
			{t('detail.back')}
		</a>
		<div class="spacer"></div>
		<button class="btn btn-secondary" onclick={() => (showEdit = true)}>
			<Pencil size={14} strokeWidth={2.4} /> {t('detail.edit')}
		</button>
		<button class="btn btn-primary" onclick={() => openProgress(id)}>
			{t('detail.update_progress')}
		</button>
	</div>

	<div class="layout">
		<aside class="side">
			<div class="detail-cover">
				<BookCover {book} size="lg" />
			</div>

			{#if book.owned}
				<div class="card">
					<span class="card-kicker">{t('detail.inventory')}</span>
					<div class="inv-grid">
						<div><div class="k">{t('detail.copies')}</div><div class="v">{book.copies}</div></div>
						<div><div class="k">{t('detail.format')}</div><div class="v">{book.format ?? '—'}</div></div>
						<div><div class="k">{t('detail.paid')}</div><div class="v">{book.pricePaid != null ? `€${book.pricePaid.toFixed(2)}` : '—'}</div></div>
						<div><div class="k">{t('detail.est_value')}</div><div class="v val">{book.estValue != null ? `€${book.estValue.toFixed(2)}` : '—'}</div></div>
					</div>
					<button class="btn btn-ghost" style="align-self:flex-start" onclick={() => addCopy(id)}>
						<Plus size={14} strokeWidth={2.4} /> {t('detail.add_copy')}
					</button>
				</div>
			{:else}
				<div class="card">
					<span class="card-kicker">{book.wanted ? t('detail.wishlist_kicker') : t('detail.not_owned_kicker')}</span>
					<div class="inv-grid">
						<div><div class="k">{t('detail.est_value')}</div><div class="v val">{book.estValue != null ? `€${book.estValue.toFixed(2)}` : '—'}</div></div>
					</div>
					<button class="btn btn-ghost" style="align-self:flex-start" onclick={() => addCopy(id)}>
						<Plus size={14} strokeWidth={2.4} /> {t('detail.acquire')}
					</button>
				</div>
			{/if}
		</aside>

		<div class="main">
			<div>
				<span class="card-kicker">{book.title}{book.year ? ` · ${book.year}` : ''}{book.publisher ? ` · ${book.publisher}` : ''}</span>
				<h2 class="title">{book.title}</h2>
				<p class="text-muted author">{book.author}</p>
				<div class="rating-row">
					<StarRating value={book.rating ?? 0} size={20} onchange={(v) => setRating(id, v)} />
					<select
						class="input status-select"
						value={book.status}
						onchange={(e) => setStatus(id, e.currentTarget.value as Book['status'])}
					>
						{#each READING_STATUSES as s (s)}
							<option value={s}>{t(`status.${s}`)}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="card">
				<div class="prog-head">
					<span class="card-kicker">{t('detail.progress')}</span>
					<span class="prog-nums">{t('detail.of_pages', { cur: book.currentPage, total: book.pages, pct })}</span>
				</div>
				<ProgressBar value={book.currentPage} max={book.pages} height={8} knob />
				{#if book.startedAt}
					<div class="started">{t('detail.started', { date: formatDate(book.startedAt) })}</div>
				{/if}
			</div>

			<div class="field">
				<div class="card-kicker" style="margin-bottom:6px">{t('form.genre')}</div>
				<TagPicker bind:ids={genreIds} kind="genre" placeholder={t('form.genre_ph')} onchange={persistTags} />
			</div>

			<div class="field">
				<div class="card-kicker" style="margin-bottom:6px">{t('detail.tags')}</div>
				<TagPicker bind:ids={labelIds} kind="label" placeholder={t('tag.placeholder')} onchange={persistTags} />
			</div>

			<div class="card">
				<div class="prog-head">
					<span class="card-kicker">{t('detail.notes')}</span>
					{#if !editingNote}
						<button class="btn btn-ghost" onclick={() => (editingNote = true)}>{t('detail.edit_note')}</button>
					{/if}
				</div>
				{#if editingNote}
					<textarea class="input" bind:value={noteDraft} rows="4"></textarea>
					<button class="btn btn-primary" style="align-self:flex-start" onclick={saveNote}>{t('detail.save_note')}</button>
				{:else if book.notes}
					<p class="note">{book.notes}</p>
				{:else}
					<p class="note text-muted">{t('detail.notes_empty')}</p>
				{/if}
			</div>

			<button class="btn btn-ghost delete" onclick={remove}>
				<Trash2 size={14} strokeWidth={2.4} /> {t('detail.delete')}
			</button>
		</div>
	</div>
{/if}

{#if showEdit && book}
	<Modal onclose={() => (showEdit = false)} width={640}>
		<span class="dialog-title">{t('edit.title')}</span>
		<BookForm initial={book} submitLabel={t('form.save')} onsubmit={saveEdit} />
	</Modal>
{/if}

<style>
	.topbar {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: var(--space-4);
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: inherit;
		font-size: 14px;
	}
	.back:hover {
		color: var(--color-accent);
	}
	.layout {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: 32px;
		align-items: start;
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.detail-cover {
		width: 100%;
	}
	.inv-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.inv-grid .k {
		font-size: 11px;
		opacity: 0.55;
	}
	.inv-grid .v {
		font-family: var(--font-heading);
		font-size: 22px;
	}
	.inv-grid .v.val {
		color: var(--color-accent-2-600);
	}
	.main {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.title {
		margin: 4px 0 2px;
		overflow-wrap: anywhere; /* long single-word titles must not widen the page */
	}
	.author {
		margin: 0 0 10px;
		font-size: 15px;
	}
	.rating-row {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}
	.status-select {
		width: auto;
		min-width: 150px;
	}
	.prog-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
	}
	.prog-nums {
		font-weight: 600;
		font-size: 13px;
	}
	.started {
		font-size: 11px;
		opacity: 0.55;
	}
	.note {
		margin: 0;
		font-size: 14px;
		line-height: 1.6;
		white-space: pre-wrap;
	}
	.delete {
		align-self: flex-start;
		color: var(--color-accent-700);
		margin-top: 8px;
	}
	@media (max-width: 720px) {
		.layout {
			grid-template-columns: 1fr;
			gap: 20px;
		}
		.side {
			flex-direction: row;
		}
		.detail-cover {
			width: 140px;
			flex: none;
		}
		.side .card {
			flex: 1;
		}
	}
</style>
