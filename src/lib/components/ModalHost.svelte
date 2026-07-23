<script lang="ts">
	import { ui } from '$lib/ui.svelte';
	import AddBookModal from './AddBookModal.svelte';
	import UpdateProgressModal from './UpdateProgressModal.svelte';
</script>

{#if ui.modal.kind === 'add'}
	<AddBookModal />
{:else if ui.modal.kind === 'progress'}
	<UpdateProgressModal bookId={ui.modal.bookId} />
{/if}
