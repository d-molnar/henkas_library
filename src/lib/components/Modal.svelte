<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		onclose,
		width = 440,
		children
	}: { onclose: () => void; width?: number; children: Snippet } = $props();

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	let dialogEl: HTMLDivElement | undefined = $state();
	$effect(() => {
		// focus the first focusable control when the dialog opens
		dialogEl?.querySelector<HTMLElement>('input, button, textarea, [tabindex]')?.focus();
		// lock body scroll while open
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window {onkeydown} />

<div
	class="dialog-backdrop"
	role="presentation"
	onclick={(e) => {
		if (e.target === e.currentTarget) onclose();
	}}
>
	<div
		class="dialog"
		style:width="min({width}px, 100%)"
		bind:this={dialogEl}
		role="dialog"
		aria-modal="true"
	>
		{@render children()}
	</div>
</div>

<style>
	.dialog-backdrop {
		z-index: 100;
	}
	.dialog {
		max-height: calc(100dvh - 2 * var(--space-4));
		overflow-y: auto;
	}
</style>
