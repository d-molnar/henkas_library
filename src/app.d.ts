// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** Token pushed by <Modal> so the back button closes it (shallow routing). */
			modal?: string;
		}
		// interface Platform {}
	}
}

export {};
