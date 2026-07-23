<script lang="ts">
	import type { Tag, TagKind } from '$lib/types';
	import { tags as tagStore, ensureTag } from '$lib/tags';
	import X from 'lucide-svelte/icons/x';

	let {
		ids = $bindable([]),
		kind,
		placeholder = '',
		onchange
	}: {
		ids: string[];
		kind: TagKind;
		placeholder?: string;
		onchange?: (ids: string[]) => void;
	} = $props();

	let draft = $state('');

	const byId = $derived(new Map($tagStore.map((tg) => [tg.id, tg])));
	const selected = $derived(
		ids.map((id) => byId.get(id)).filter((tg): tg is Tag => Boolean(tg))
	);
	const suggestions = $derived(
		draft.trim()
			? $tagStore
					.filter(
						(tg) =>
							tg.kind === kind &&
							!ids.includes(tg.id) &&
							tg.name.toLowerCase().includes(draft.trim().toLowerCase())
					)
					.slice(0, 5)
			: []
	);

	async function addByName(name: string) {
		const val = name.trim();
		if (!val) return;
		const id = await ensureTag(val, kind);
		if (!ids.includes(id)) {
			ids = [...ids, id];
			onchange?.(ids);
		}
		draft = '';
	}
	function addExisting(id: string) {
		if (!ids.includes(id)) {
			ids = [...ids, id];
			onchange?.(ids);
		}
		draft = '';
	}
	function remove(id: string) {
		ids = ids.filter((x) => x !== id);
		onchange?.(ids);
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addByName(draft);
		} else if (e.key === 'Backspace' && draft === '' && ids.length) {
			remove(ids[ids.length - 1]);
		}
	}

	const chipClass = kind === 'genre' ? 'tag-accent-2' : 'tag-accent';
</script>

<div class="tagpicker">
	<div class="control">
		{#each selected as tg (tg.id)}
			<span class="tag {chipClass}">
				{tg.name}
				<button type="button" aria-label="Remove {tg.name}" onclick={() => remove(tg.id)}>
					<X size={12} strokeWidth={2.6} />
				</button>
			</span>
		{/each}
		<input class="bare" {placeholder} bind:value={draft} {onkeydown} onblur={() => addByName(draft)} />
	</div>
	{#if suggestions.length}
		<div class="suggestions">
			{#each suggestions as tg (tg.id)}
				<button type="button" class="tag {chipClass} ghost" onclick={() => addExisting(tg.id)}>
					{tg.name}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tagpicker {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.control {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		background: var(--color-surface);
		border: 1px solid var(--color-divider);
		border-radius: var(--radius-md);
	}
	.control:focus-within {
		border-color: var(--color-accent);
	}
	.tag button {
		display: inline-flex;
		align-items: center;
		background: none;
		border: 0;
		margin-left: 4px;
		padding: 0;
		cursor: pointer;
		color: inherit;
		opacity: 0.7;
	}
	.tag button:hover {
		opacity: 1;
	}
	.bare {
		flex: 1;
		min-width: 100px;
		border: 0;
		background: none;
		outline: none;
		font: inherit;
		font-size: 14px;
		color: var(--color-text);
		padding: 4px 0;
	}
	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.suggestions .tag.ghost {
		cursor: pointer;
		border: 1px dashed var(--color-divider);
		background: transparent;
		font: inherit;
		font-size: 11px;
		color: inherit;
		opacity: 0.8;
	}
	.suggestions .tag.ghost:hover {
		opacity: 1;
		border-color: var(--color-accent);
	}
</style>
