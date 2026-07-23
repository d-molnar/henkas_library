import { describe, it, expect } from 'vitest';
import { parseRosterResponse } from './openlibrary';

describe('parseRosterResponse', () => {
	it('extracts ordinal+title from search docs and sorts by ordinal', () => {
		const json = {
			docs: [
				{ title: 'The Tombs of Atuan', series: ['Earthsea #2'] },
				{ title: 'A Wizard of Earthsea', series: ['Earthsea #1'] }
			]
		};
		expect(parseRosterResponse(json)).toEqual([
			{ ordinal: 1, title: 'A Wizard of Earthsea' },
			{ ordinal: 2, title: 'The Tombs of Atuan' }
		]);
	});

	it('drops docs with no parseable ordinal and dedupes by ordinal', () => {
		const json = {
			docs: [
				{ title: 'Companion', series: ['Earthsea'] }, // no ordinal → dropped
				{ title: 'A Wizard of Earthsea', series: ['Earthsea #1'] },
				{ title: 'A Wizard of Earthsea (reissue)', series: ['Earthsea #1'] } // dup ordinal → dropped
			]
		};
		expect(parseRosterResponse(json)).toEqual([{ ordinal: 1, title: 'A Wizard of Earthsea' }]);
	});

	it('returns [] for a malformed response', () => {
		expect(parseRosterResponse(null)).toEqual([]);
		expect(parseRosterResponse({})).toEqual([]);
	});
});
