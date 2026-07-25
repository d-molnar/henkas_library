<script lang="ts">
	let {
		value,
		max = 100,
		height = 5,
		knob = false,
		color,
		label
	}: {
		value: number;
		max?: number;
		height?: number;
		knob?: boolean;
		/** Override the fill colour (defaults to the accent from app.css). */
		color?: string;
		label?: string;
	} = $props();

	const pct = $derived(max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);
</script>

<div
	class="progress"
	style:height="{height}px"
	role="progressbar"
	aria-valuenow={Math.round(pct)}
	aria-label={label}
>
	<span style:width="{pct}%" style:background={color}></span>
	{#if knob}
		<i class="knob" style:left="{pct}%"></i>
	{/if}
</div>

<style>
	.progress {
		position: relative;
	}
	.knob {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--color-accent);
		border: 3px solid var(--color-bg);
		box-shadow: 0 1px 2px color-mix(in srgb, #2e2b25 30%, transparent);
	}
</style>
