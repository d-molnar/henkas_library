<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { ensureSeeded } from '$lib/db';
	import { openAdd } from '$lib/ui.svelte';
	import { t, i18n, setLocale, LOCALES, type LocaleCode } from '$lib/i18n/index.svelte';
	import ModalHost from '$lib/components/ModalHost.svelte';
	import BookIcon from 'lucide-svelte/icons/book-open';
	import Plus from 'lucide-svelte/icons/plus';
	import LibraryBig from 'lucide-svelte/icons/library-big';
	import Languages from 'lucide-svelte/icons/languages';
	import TagsIcon from 'lucide-svelte/icons/tags';

	let { children } = $props();

	ensureSeeded();

	const path = $derived(page.url.pathname);
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
	<title>Henka's Lib</title>
</svelte:head>

<div class="app-shell">
	<nav class="nav topnav">
		<a class="nav-brand" href="/">
			<BookIcon size={20} strokeWidth={2.4} color="var(--color-accent)" />
			<span>Henka's Lib</span>
		</a>
		<a class="nav-link" href="/tags" aria-current={path === '/tags' ? 'page' : undefined}>
			<TagsIcon size={16} strokeWidth={2.2} /> {t('nav.tags')}
		</a>
		<label class="lang" title={t('app.language')}>
			<Languages size={16} strokeWidth={2.2} />
			<select
				aria-label={t('app.language')}
				value={i18n.locale}
				onchange={(e) => setLocale(e.currentTarget.value as LocaleCode)}
			>
				{#each LOCALES as l (l.code)}
					<option value={l.code}>{l.name}</option>
				{/each}
			</select>
		</label>
		<button class="btn btn-primary" onclick={openAdd}>
			<Plus size={16} strokeWidth={2.6} /> {t('nav.add')}
		</button>
	</nav>

	<main class="app-main">
		{@render children()}
	</main>

	<nav class="tabbar">
		<a href="/" aria-current={path === '/' ? 'page' : undefined}>
			<LibraryBig size={20} strokeWidth={2.2} />
			<span>{t('nav.shelf')}</span>
		</a>
		<a href="/tags" aria-current={path === '/tags' ? 'page' : undefined}>
			<TagsIcon size={20} strokeWidth={2.2} />
			<span>{t('nav.tags')}</span>
		</a>
		<button type="button" onclick={openAdd} class="tab-btn">
			<Plus size={20} strokeWidth={2.2} />
			<span>{t('nav.add_short')}</span>
		</button>
	</nav>
</div>

<ModalHost />

<style>
	.topnav {
		position: sticky;
		top: 0;
		z-index: 30;
		background: color-mix(in srgb, var(--color-bg) 88%, transparent);
		backdrop-filter: blur(8px);
		max-width: 1100px;
		margin: 0 auto;
		width: 100%;
	}
	.nav-brand {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: inherit;
	}
	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.tab-btn {
		background: none;
		border: 0;
		cursor: pointer;
		font: inherit;
		color: inherit;
	}
	.lang {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		opacity: 0.75;
	}
	.lang select {
		border: 0;
		background: none;
		font: inherit;
		font-size: 14px;
		color: inherit;
		cursor: pointer;
		padding: 2px 2px;
	}
	.lang select:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		border-radius: 6px;
	}
</style>
