<script lang="ts">
	let {
		value = 0,
		size = 16,
		readonly = false,
		onchange
	}: { value?: number; size?: number; readonly?: boolean; onchange?: (v: number) => void } = $props();

	function set(n: number) {
		if (readonly) return;
		// clicking the current single-star rating clears it
		onchange?.(value === n ? 0 : n);
	}
</script>

<span class="stars" style:font-size="{size}px">
	{#each [1, 2, 3, 4, 5] as n (n)}
		{#if readonly}
			<span class:empty={n > value}>{n <= value ? '★' : '☆'}</span>
		{:else}
			<button
				type="button"
				class:empty={n > value}
				aria-label="{n} star{n > 1 ? 's' : ''}"
				onclick={() => set(n)}>{n <= value ? '★' : '☆'}</button
			>
		{/if}
	{/each}
</span>

<style>
	.stars button {
		background: none;
		border: 0;
		padding: 0 1px;
		cursor: pointer;
		color: inherit;
		font: inherit;
		line-height: 1;
	}
	.stars button:hover {
		transform: scale(1.15);
	}
</style>
