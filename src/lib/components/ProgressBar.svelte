<script lang="ts">
	let {
		value,
		max = 100,
		height = 5,
		knob = false,
		color,
		label,
		onseek
	}: {
		value: number;
		max?: number;
		height?: number;
		knob?: boolean;
		/** Override the fill colour (defaults to the accent from app.css). */
		color?: string;
		label?: string;
		/** When given, the bar becomes a slider: tap or drag to pick a value. */
		onseek?: (value: number) => void;
	} = $props();

	const pct = $derived(max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);

	let track: HTMLDivElement | undefined = $state();

	function seekTo(clientX: number) {
		if (!onseek || !track || max <= 0) return;
		const box = track.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
		onseek(Math.round(ratio * max));
	}

	function onpointerdown(e: PointerEvent) {
		if (!onseek) return;
		e.preventDefault();
		track?.setPointerCapture(e.pointerId);
		seekTo(e.clientX);
	}
	function onpointermove(e: PointerEvent) {
		// Only track the finger/mouse while it's down — pointer capture tells us.
		if (!onseek || !track?.hasPointerCapture(e.pointerId)) return;
		seekTo(e.clientX);
	}
	function onkeydown(e: KeyboardEvent) {
		if (!onseek) return;
		const step = e.shiftKey ? 10 : 1;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onseek(Math.max(0, value - step));
		else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onseek(Math.min(max, value + step));
		else if (e.key === 'Home') onseek(0);
		else if (e.key === 'End') onseek(max);
		else return;
		e.preventDefault();
	}
</script>

<!-- The role is dynamic (slider when seekable, progressbar otherwise); the
     linter only sees the static element and flags the tabindex. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="progress"
	class:has-knob={knob}
	class:seekable={!!onseek}
	style:height="{height}px"
	bind:this={track}
	role={onseek ? 'slider' : 'progressbar'}
	tabindex={onseek ? 0 : undefined}
	aria-valuenow={onseek ? value : Math.round(pct)}
	aria-valuemin={onseek ? 0 : undefined}
	aria-valuemax={onseek ? max : undefined}
	aria-label={label}
	{onpointerdown}
	{onpointermove}
	{onkeydown}
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
	/* .progress clips its fill to stay rounded, which also chopped the knob into
	   a square. The fill is rounded on its own, so let the knob out of the box. */
	.progress.has-knob {
		overflow: visible;
	}
	/* A 8px-tall bar is an unusable touch target; pad the hit area out to ~40px
	   with a pseudo-element so the visual bar stays thin. */
	.progress.seekable {
		cursor: pointer;
		touch-action: none;
	}
	.progress.seekable::before {
		content: '';
		position: absolute;
		inset: -10px 0 -16px;
	}
	.progress.seekable:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 6px;
		border-radius: 999px;
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
