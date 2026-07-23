import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Local-first PWA: a pure client-side SPA with IndexedDB for storage.
			// A single fallback document serves every route on any static host.
			adapter: adapter({ fallback: 'index.html' })
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: "Henka's Lib",
				short_name: "Henka's Lib",
				description:
					'A warm, personal book library — shelf, series, lending and reading stats, all on your device.',
				theme_color: '#c67139',
				background_color: '#f5ead8',
				display: 'standalone',
				orientation: 'any',
				start_url: '/',
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: { cacheName: 'google-fonts-stylesheets' }
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-webfonts',
							expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
						}
					},
					{
						// Open Library cover images used by the add-book search
						urlPattern: /^https:\/\/covers\.openlibrary\.org\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'book-covers',
							expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 90 }
						}
					}
				]
			}
		})
	]
});
