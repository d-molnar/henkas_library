import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	},
	resolve: {
		alias: {
			// Stub SvelteKit's runtime module so pure-logic tests can import domain
			// modules that transitively pull in db.ts.
			'$app/environment': fileURLToPath(new URL('./src/test-stubs/app-environment.ts', import.meta.url))
		}
	}
});
