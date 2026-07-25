// Test stub for SvelteKit's `$app/environment`, which the standalone vitest
// (node) config can't resolve. db.ts only reads `browser`; false keeps liveQuery
// subscriptions and seeding inert so pure-logic tests can import the domain modules.
export const browser = false;
export const dev = false;
export const building = false;
export const version = 'test';
