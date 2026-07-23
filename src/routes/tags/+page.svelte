<script lang="ts">
	import { books } from '$lib/books';
	import { tags as tagStore, renameTag, deleteTag, mergeTags } from '$lib/tags';
	import { t } from '$lib/i18n/index.svelte';
	import type { Tag, TagKind } from '$lib/types';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	// Usage counts: how many books reference each tag id.
	const usage = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const b of $books) {
			for (const id of b.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		return counts;
	});
	const countOf = $derived((id: string) => usage.get(id) ?? 0);

	const byKind = $derived(
		(kind: TagKind) =>
			$tagStore
				.filter((tg) => tg.kind === kind)
				.sort((a, b) => a.name.localeCompare(b.name))
	);

	const sections = $derived([
		{ kind: 'genre' as const, label: t('tags.genres'), chip: 'tag-accent-2', items: byKind('genre') },
		{ kind: 'label' as const, label: t('tags.labels'), chip: 'tag-accent', items: byKind('label') }
	]);

	function commitRename(tag: Tag, value: string) {
		const name = value.trim();
		if (name && name !== tag.name) renameTag(tag.id, name);
	}

	async function remove(tag: Tag) {
		if (confirm(t('tags.delete_confirm', { name: tag.name, count: countOf(tag.id) }))) {
			await deleteTag(tag.id);
		}
	}

	async function merge(tag: Tag, intoId: string, select: HTMLSelectElement) {
		const into = $tagStore.find((tg) => tg.id === intoId);
		if (!into) return;
		if (confirm(t('tags.merge_confirm', { from: tag.name, into: into.name }))) {
			await mergeTags(tag.id, intoId);
		}
		select.value = ''; // reset the picker either way
	}
</script>

<div class="head">
	<h1>{t('tags.title')}</h1>
</div>

{#if $tagStore.length === 0}
	<p class="text-muted empty">{t('tags.empty')}</p>
{:else}
	{#each sections as section (section.kind)}
		<section class="group">
			<h4>{section.label}</h4>
			{#if section.items.length === 0}
				<p class="text-muted section-empty">{t('tags.empty_section')}</p>
			{:else}
				<ul class="tag-list">
					{#each section.items as tag (tag.id)}
						<li class="row">
							<span class="dot {section.chip}" aria-hidden="true"></span>
							<input
								class="name"
								aria-label={t('tags.rename_aria')}
								value={tag.name}
								onblur={(e) => commitRename(tag, e.currentTarget.value)}
								onkeydown={(e) => {
									if (e.key === 'Enter') e.currentTarget.blur();
								}}
							/>
							<span class="count text-muted">{t('tags.usage', { count: countOf(tag.id) })}</span>
							<select
								class="merge"
								aria-label={t('tags.merge_into')}
								onchange={(e) => merge(tag, e.currentTarget.value, e.currentTarget)}
							>
								<option value="" selected>{t('tags.merge_into')}</option>
								{#each section.items.filter((o) => o.id !== tag.id) as other (other.id)}
									<option value={other.id}>{other.name}</option>
								{/each}
							</select>
							<button
								type="button"
								class="btn btn-icon"
								aria-label={t('tags.delete_aria')}
								onclick={() => remove(tag)}
							>
								<Trash2 size={16} strokeWidth={2.4} />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}
{/if}

<style>
	.head {
		margin-bottom: var(--space-6);
	}
	.empty {
		padding: var(--space-8) 0;
	}
	.group {
		margin-bottom: var(--space-8);
	}
	.group h4 {
		margin-bottom: var(--space-3);
	}
	.section-empty {
		font-size: 14px;
	}
	.tag-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-divider);
		border-radius: var(--radius-md);
	}
	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.name {
		flex: 1;
		min-width: 0;
		border: 1px solid transparent;
		background: none;
		font: inherit;
		font-size: 15px;
		color: var(--color-text);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
	}
	.name:hover {
		border-color: var(--color-divider);
	}
	.name:focus-visible {
		outline: none;
		border-color: var(--color-accent);
	}
	.count {
		font-size: 13px;
		white-space: nowrap;
	}
	.merge {
		font: inherit;
		font-size: 13px;
		color: inherit;
		background: var(--color-bg);
		border: 1px solid var(--color-divider);
		border-radius: var(--radius-sm);
		padding: 4px 6px;
		cursor: pointer;
		max-width: 140px;
	}
	.merge:hover {
		border-color: var(--color-accent);
	}
	@media (max-width: 560px) {
		.merge {
			max-width: 96px;
		}
	}
</style>
