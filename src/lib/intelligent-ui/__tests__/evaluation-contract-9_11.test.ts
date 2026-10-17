import { describe, it, expect } from 'vitest';
import {
	evaluateV6,
	asksOrExplainsMissing,
	usedProvidedNumbers,
	imageRefsAreProvided,
	type EvaluationCase,
	type ResponseClassification
} from '../evaluation';

function cls(partial: Partial<ResponseClassification>): ResponseClassification {
	return {
		channel: 'markdown',
		families: [],
		srcs: [],
		fenceContent: '',
		prose: '',
		jsLeaks: [],
		...partial
	};
}

const providedComparison: EvaluationCase = {
	id: 't1',
	prompt: 'Compare Basic 99 kr and Pro 199 kr.',
	language: 'en',
	intent: 'comparison',
	dataAvailable: 'provided',
	providedNumbers: [99, 199],
	expectedChannel: 'native',
	expectedFamily: 'Comparison'
};

describe('M9.11 — evaluation contract v6', () => {
	it('native with the provided numbers and family is fully correct', () => {
		const v = evaluateV6(providedComparison, cls({
			channel: 'native',
			families: ['Composed', 'Comparison'],
			fenceContent: 'root = Comparison("Plans", [{name:"Basic",attributes:["99 kr"]}])'
		}));
		expect(v.channelOk).toBe(true);
		expect(v.familyOk).toBe(true);
		expect(v.fabricatedFacts).toBe(false);
		expect(v.errorCategory).toBeNull();
	});

	it('detects fabrication when provided numbers are ignored', () => {
		const v = evaluateV6(providedComparison, cls({
			channel: 'native',
			families: ['Comparison'],
			fenceContent: 'root = Comparison("Plans", [{name:"Basic",attributes:["149 kr"]}])'
		}));
		expect(v.channelOk).toBe(true);
		expect(v.fabricatedFacts).toBe(true);
		expect(v.errorCategory).toBe('fabricated');
	});

	it('detects invented image sources (Gallery)', () => {
		const c: EvaluationCase = {
			id: 't2', prompt: 'Show these images: /favicon.png', language: 'en',
			intent: 'images', dataAvailable: 'provided',
			providedImageRefs: ['/favicon.png'],
			expectedChannel: 'native', expectedFamily: 'Gallery'
		};
		const ok = evaluateV6(c, cls({ channel: 'native', families: ['Gallery'], srcs: ['/favicon.png'] }));
		expect(ok.fabricatedFacts).toBe(false);
		const invented = evaluateV6(c, cls({ channel: 'native', families: ['Gallery'], srcs: ['https://evil.example/x.png'] }));
		expect(invented.fabricatedFacts).toBe(true);
		expect(invented.errorCategory).toBe('fabricated');
	});

	it('credits asking for missing data (EN + NO)', () => {
		expect(asksOrExplainsMissing('I do not have the photos — could you attach them?')).toBe(true);
		expect(asksOrExplainsMissing('Jeg mangler bildene. Kan du legge dem ved?')).toBe(true);
		expect(asksOrExplainsMissing('Here is a table of planets.')).toBe(false);
	});

	it('missing-data case: markdown + ask is CORRECT; markdown without ask is no-ask', () => {
		const c: EvaluationCase = {
			id: 't3', prompt: 'Show the photos.', language: 'en',
			intent: 'images', dataAvailable: 'unavailable',
			expectedChannel: 'native', expectedFamily: 'Gallery', missingDataOk: true
		};
		const ask = evaluateV6(c, cls({ channel: 'markdown', prose: 'No photos are attached — please attach them and I will show the gallery.' }));
		expect(ask.channelOk).toBe(true);
		expect(ask.familyOk).toBe(true);
		expect(ask.askedForMissingData).toBe(true);
		const silent = evaluateV6(c, cls({ channel: 'markdown', prose: 'Photos are nice.' }));
		expect(silent.channelOk).toBe(false);
		expect(silent.errorCategory).toBe('no-ask');
	});

	it('without missingDataOk, markdown is under-use even with an ask', () => {
		const v = evaluateV6(providedComparison, cls({ channel: 'markdown', prose: 'Which plans did you mean?' }));
		expect(v.channelOk).toBe(false);
		expect(v.errorCategory).toBe('under-use');
	});

	it('prose intent: UI is over-use', () => {
		const c: EvaluationCase = {
			id: 't4', prompt: 'Explain TCP vs UDP.', language: 'en',
			intent: 'prose', dataAvailable: 'model', expectedChannel: 'markdown'
		};
		const v = evaluateV6(c, cls({ channel: 'native', families: ['Comparison'] }));
		expect(v.channelOk).toBe(false);
		expect(v.errorCategory).toBe('over-use');
	});

	it('rich mapping: over-use and under-use', () => {
		const calc: EvaluationCase = {
			id: 't5', prompt: 'Build a tip calculator.', language: 'en',
			intent: 'interactive', dataAvailable: 'model',
			expectedChannel: 'native', expectedFamily: 'Form'
		};
		expect(evaluateV6(calc, cls({ channel: 'rich' })).errorCategory).toBe('rich-over-use');
		const custom: EvaluationCase = {
			id: 't6', prompt: 'Build a 3D globe.', language: 'en',
			intent: 'custom', dataAvailable: 'model', expectedChannel: 'rich'
		};
		expect(evaluateV6(custom, cls({ channel: 'native', families: ['Form'] })).errorCategory).toBe('rich-under-use');
	});

	it('wrong family and not-mixed are distinct', () => {
		const v = evaluateV6(providedComparison, cls({ channel: 'native', families: ['Table'] }));
		expect(v.channelOk).toBe(true);
		expect(v.errorCategory).toBe('wrong-family');
		const mixed: EvaluationCase = { ...providedComparison, expectMixed: true };
		const m = evaluateV6(mixed, cls({ channel: 'native', families: ['Comparison'], prose: 'ok' }));
		expect(m.errorCategory).toBe('not-mixed');
	});

	it('provided-numbers and image-ref helpers', () => {
		expect(usedProvidedNumbers('total = 12 * 250', [12, 250])).toBe(true);
		expect(usedProvidedNumbers('root = Metric("T", "1")', [12, 250])).toBe(false);
		expect(usedProvidedNumbers('anything', [])).toBe(true); // no data to check
		// formatting-insensitive: thousands separators and decimal commas
		expect(usedProvidedNumbers('attributes:["120 000 kr"]', [120000])).toBe(true);
		expect(usedProvidedNumbers('values:[1,2]', [1.2])).toBe(true);
		expect(usedProvidedNumbers('attributes:["149 000 kr"]', [120000, 150000])).toBe(false);
		expect(imageRefsAreProvided(['/favicon.png'], ['/favicon.png'])).toBe(true);
		expect(imageRefsAreProvided([], ['/favicon.png'])).toBe(false); // no gallery emitted
		expect(imageRefsAreProvided(['/a.png'], [])).toBe(false); // nothing provided
	});
});
