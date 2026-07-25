<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';

	let {
		onclose,
		width = 440,
		children
	}: { onclose: () => void; width?: number; children: Snippet } = $props();

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	// Back button closes the modal: opening pushes a shallow history entry (same
	// URL, marker in page.state) and popping it — via the browser/Android back
	// button — closes. Forward re-pushes the entry but does not reopen; a dialog
	// isn't a place, so re-entering it by accident would be worse than the
	// dangling entry.
	const token = crypto.randomUUID();
	let pushed = $state(false);
	// Set the moment history drops our entry, so teardown knows the entry is
	// already gone. Reading page.state in the teardown itself is too late —
	// SvelteKit updates it after the pop, and we'd pop a second entry.
	let popped = false;
	// onMount, not $effect: pushState touches page state, and an effect that both
	// reads and writes it re-runs, tearing down and re-pushing on every change.
	onMount(() => {
		pushState('', { modal: token });
		pushed = true;
		return () => {
			// Closed from the UI while our entry is still current — drop it, so the
			// next back press leaves the page instead of doing nothing.
			if (!popped) history.back();
		};
	});
	$effect(() => {
		if (pushed && page.state.modal !== token) {
			popped = true;
			onclose();
		}
	});

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
