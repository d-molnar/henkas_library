import type { Cover } from './types';

/**
 * Cover palettes taken from the Organic ramps used in the mockups. Book "covers"
 * are two-stop gradients in one of these families, with ink colours that read on
 * the dark end of the gradient.
 */
const PALETTES: Cover[] = [
	{ from: '#8c491a', to: '#402310', ink: '#ffe1d0', sub: '#ffc6a5' }, // deep terracotta
	{ from: '#b2622d', to: '#643312', ink: '#ffe1d0', sub: '#ffc6a5' }, // terracotta
	{ from: '#d67f48', to: '#8c491a', ink: '#fff2eb', sub: '#ffe1d0' }, // light terracotta
	{ from: '#56633f', to: '#272e1b', ink: '#e1eecc', sub: '#ccdbb2' }, // deep sage
	{ from: '#728157', to: '#3d472b', ink: '#f0fae1', sub: '#ccdbb2' }, // sage
	{ from: '#8fa073', to: '#56633f', ink: '#f0fae1', sub: '#e1eecc' }, // light sage
	{ from: '#645c50', to: '#2e2b25', ink: '#eee7db', sub: '#c0b6a5' }, // neutral
	{ from: '#82796a', to: '#474238', ink: '#f9f4ed', sub: '#dcd3c4' }, // warm neutral
	{ from: '#a19786', to: '#474238', ink: '#f9f4ed', sub: '#dcd3c4' } // light neutral
];

export function coverGradient(cover: Cover): string {
	return `linear-gradient(160deg, ${cover.from}, ${cover.to})`;
}

/** Deterministically pick a palette from a title so new books get stable covers. */
export function coverFor(seed: string): Cover {
	let h = 0;
	for (let i = 0; i < seed.length; i++) {
		h = (h * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return PALETTES[h % PALETTES.length];
}
