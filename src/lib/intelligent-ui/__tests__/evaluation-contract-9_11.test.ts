import { describe, it, expect } from 'vitest';
import {
	evaluateV6,
	asksOrExplainsMissing,
	usedProvidedNumbers,
	imageRefsAreProvided,
	validateRichWidget,
	extractNumberTokens,
	PRESENTATION_INTENTS,
	type EvaluationCase,
	type ResponseClassification
} from '../evaluation';

function cls(partial: Partial<ResponseClassification>): ResponseClassification {
	return {
		channel: 'markdown',
		families: [],
		srcs: [],
		fenceContent: '',
		richHtml: '',
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

// ---------------------------------------------------------------------------
// The OLD v6 contract logic, replicated verbatim for the adversarial tests —
// each test below demonstrates a case where it produced a FALSE verdict, and
// asserts the v7 contract gets it right.
// ---------------------------------------------------------------------------
const oldUsedProvidedNumbers = (fence: string, provided: (string | number)[]): boolean =>
	!provided?.length || provided.some((n) => fence.includes(String(n)));

const oldVerdictChannelOk = (c: EvaluationCase, r: ResponseClassification): boolean => {
	if (c.expectedChannel === 'markdown') return r.channel === 'markdown';
	if (c.expectedChannel === 'rich') return r.channel === 'rich';
	return r.channel === 'native' || (r.channel === 'markdown' && !!c.missingDataOk && asksOrExplainsMissing(r.prose));
};

const oldFabricatedSrcs = (c: EvaluationCase, r: ResponseClassification): boolean =>
	r.channel === 'native' &&
	c.intent === 'images' &&
	!!c.providedImageRefs?.length &&
	!imageRefsAreProvided(r.srcs, c.providedImageRefs);

const oldRichOk = (r: ResponseClassification): boolean => r.channel === 'rich';

describe('M9.11 — evaluation contract v7: adversarial regressions (old v6 false verdicts)', () => {
	it('OLD .some(): partial data use was credited; v7 requires ALL supplied values', () => {
		const fence = 'root = Comparison("Plans", [{name:"Basic",attributes:["99 kr"]}])'; // 199 never shown
		expect(oldUsedProvidedNumbers(fence, [99, 199])).toBe(true); // OLD false positive
		expect(usedProvidedNumbers(fence, [99, 199])).toBe(false); // v7: fabrication
		const v = evaluateV6(providedComparison, cls({ channel: 'native', families: ['Comparison'], fenceContent: fence }));
		expect(v.fabricatedFacts).toBe(true);
		expect(v.errorCategory).toBe('fabricated');
		expect(v.overallOk).toBe(false); // fabrication is never overall-successful
	});

	it('OLD substring matching: "112" credited a supplied 12; v7 matches whole tokens', () => {
		const fence = 'root = Table("T", ["n"], [["112"]])'; // 112 — not 12
		expect(oldUsedProvidedNumbers(fence, [12])).toBe(true); // OLD false positive ("112".includes("12"))
		expect(usedProvidedNumbers(fence, [12])).toBe(false); // v7
		expect(extractNumberTokens('112 12 1200')).toEqual(expect.arrayContaining([112, 12, 1200]));
	});

	it('OLD substring matching: a computed output was credited as a source; v7 is not fooled', () => {
		// supplied 3 (source), the UI shows only the computed 3000
		const fence = 'root = Metric("Total", "3000")';
		expect(oldUsedProvidedNumbers(fence, [3])).toBe(true); // OLD false positive
		expect(usedProvidedNumbers(fence, [3])).toBe(false); // v7: source never shown
	});

	it('OLD flagged correct unit-scaled outputs as fabrication; v7 accepts same-digit normalizations only', () => {
		// Separator normalization (same digits) IS a match:
		expect(usedProvidedNumbers('attributes:["120 000 kr"]', [120000])).toBe(true);
		expect(usedProvidedNumbers('attributes:["120,000 kr"]', [120000])).toBe(true);
		expect(usedProvidedNumbers('values:[1,2]', [1.2])).toBe(true);
		expect(usedProvidedNumbers('values:[1.20]', [1.2])).toBe(true);
		// Magnitude scaling (different digits) is NOT credited — a scaled or
		// computed output is not the source input (deliberate v7 strictness):
		expect(usedProvidedNumbers('values:[1200000]', [1.2])).toBe(false);
		expect(usedProvidedNumbers('values:[1200]', [1.2])).toBe(false);
		expect(usedProvidedNumbers('root = Metric("Total", "3000")', [3])).toBe(false);
	});

	it('OLD credited invented native UI for UNAVAILABLE data; v7 never does', () => {
		const c: EvaluationCase = {
			id: 't3', prompt: 'Show the photos from the offsite.', language: 'en',
			intent: 'images', dataAvailable: 'unavailable',
			expectedChannel: 'native', expectedFamily: 'Gallery', missingDataOk: true
		};
		// model invents a gallery with made-up srcs
		const r = cls({ channel: 'native', families: ['Composed', 'Gallery'], srcs: ['/img/photo-1.jpg', '/img/photo-2.jpg'] });
		expect(oldVerdictChannelOk(c, r)).toBe(true); // OLD: native = credited, no questions asked
		const v = evaluateV6(c, r);
		expect(v.channelOk).toBe(false); // v7: invented data in a native UI
		expect(v.fabricatedFacts).toBe(true); // ...and the srcs were invented (nothing was provided)
		expect(v.errorCategory).toBe('fabricated-ui');
		expect(v.overallOk).toBe(false);
	});

	it('OLD credited markdown asks (correct) — v7 still does (no regression)', () => {
		const c: EvaluationCase = {
			id: 't3b', prompt: 'Show the photos from the offsite.', language: 'en',
			intent: 'images', dataAvailable: 'unavailable',
			expectedChannel: 'native', expectedFamily: 'Gallery', missingDataOk: true
		};
		const v = evaluateV6(c, cls({ channel: 'markdown', prose: 'No photos are attached — please attach them and I will show the gallery.' }));
		expect(v.channelOk).toBe(true);
		expect(v.askedForMissingData).toBe(true);
		expect(v.overallOk).toBe(true);
	});

	it('v7 credits native UI for unavailable data ONLY via authorized retrieval (Query)', () => {
		const c: EvaluationCase = {
			id: 't3c', prompt: 'Show my notes.', language: 'en',
			intent: 'query', dataAvailable: 'unavailable',
			expectedChannel: 'native', expectedFamily: 'Query', missingDataOk: true
		};
		const viaQuery = evaluateV6(c, cls({ channel: 'native', families: ['Query', 'Composed'] }));
		expect(viaQuery.channelOk).toBe(true); // verified authorized retrieval
		const invented = evaluateV6(c, cls({ channel: 'native', families: ['Table', 'Composed'], fenceContent: 'root = Table("Notes", ["x"], [["made up"]])' }));
		expect(invented.channelOk).toBe(false);
		expect(invented.errorCategory).toBe('fabricated-ui');
	});

	it('OLD missed invented image refs when NOTHING was provided; v7 detects them', () => {
		const c: EvaluationCase = {
			id: 't4', prompt: 'Show the product shots.', language: 'en',
			intent: 'images', dataAvailable: 'unavailable',
			expectedChannel: 'native', expectedFamily: 'Gallery', missingDataOk: true
		};
		const r = cls({ channel: 'native', families: ['Gallery'], srcs: ['https://cdn.example/fake.jpg'] });
		expect(oldFabricatedSrcs(c, r)).toBe(false); // OLD: guard required providedImageRefs.length
		const v = evaluateV6(c, r);
		expect(v.fabricatedFacts).toBe(true); // v7: refs emitted, none supplied → invented
	});

	it('OLD accepted ANY :::intelligent-ui-html fence as valid Rich; v7 validates the body', () => {
		const validBody = '<div style="padding:12px;color:var(--viz-text)">Custom canvas playground.</div>';
		expect(validateRichWidget('')).toEqual({ valid: false, reason: 'empty-or-trivial' });
		expect(validateRichWidget('   \n  ')).toEqual({ valid: false, reason: 'empty-or-trivial' });
		expect(validateRichWidget('just some words, no markup at all here')).toEqual({ valid: false, reason: 'no-html-content' });
		expect(validateRichWidget('<div><img src="https://evil.example/x.png"></div>')).toEqual({ valid: false, reason: 'external-network-reference' });
		expect(validateRichWidget('<div onclick="javascript:alert(1)">x</div>')).toEqual({ valid: false, reason: 'javascript-uri' });
		expect(validateRichWidget(validBody).valid).toBe(true);
		const custom: EvaluationCase = {
			id: 't5', prompt: 'Build a 3D globe.', language: 'en',
			intent: 'custom', dataAvailable: 'model', expectedChannel: 'rich'
		};
		const broken = cls({ channel: 'rich', richHtml: '' }); // fence present, no body
		expect(oldRichOk(broken)).toBe(true); // OLD: presence only
		const v = evaluateV6(custom, broken);
		expect(v.channelOk).toBe(false); // v7
		expect(v.errorCategory).toBe('invalid-rich');
		expect(v.overallOk).toBe(false);
		const good = evaluateV6(custom, cls({ channel: 'rich', richHtml: validBody }));
		expect(good.channelOk).toBe(true);
		expect(good.overallOk).toBe(true);
	});
});

describe('M9.11 — evaluation contract v7: correct behavior preserved', () => {
	it('native with ALL provided numbers and the right family is fully correct', () => {
		const fence = 'root = Comparison("Plans", [{name:"Basic",attributes:["99 kr"]},{name:"Pro",attributes:["199 kr"]}])';
		const v = evaluateV6(providedComparison, cls({ channel: 'native', families: ['Composed', 'Comparison'], fenceContent: fence }));
		expect(v.channelOk && v.familyOk && !v.fabricatedFacts).toBe(true);
		expect(v.overallOk).toBe(true);
		expect(v.errorCategory).toBeNull();
	});

	it('robust numeric normalization: thousands separators, decimal commas, signs, space-ambiguous runs', () => {
		expect(usedProvidedNumbers('attributes:["120 000 kr"]', [120000])).toBe(true);
		expect(usedProvidedNumbers('values:[1,2]', [1.2])).toBe(true);
		expect(usedProvidedNumbers('range: 50000-500500', [50000, 500500])).toBe(true); // range dash
		expect(usedProvidedNumbers('anomaly: -0.16', [-0.16])).toBe(true); // negative value
		expect(usedProvidedNumbers('values:[1.200]', [1200])).toBe(true); // European thousands
		expect(usedProvidedNumbers('attributes:["149 000 kr"]', [120000, 150000])).toBe(false);
		// space-ambiguous runs: both the whole run and the segments are plausible
		expect(extractNumberTokens('112 12 1200')).toEqual(expect.arrayContaining([112121200, 112, 12, 1200]));
		expect(usedProvidedNumbers('n: 112 12 1200', [12, 1200])).toBe(true);
		// comma-separated OpenUI arrays are lists, not one thousands-separator number
		expect(usedProvidedNumbers('values:[120,135,150,180,210,240]', [120, 135, 150, 180, 210, 240])).toBe(true);
		expect(usedProvidedNumbers('values:[-0.16,0.45]', [-0.16, 0.45])).toBe(true);
		expect(usedProvidedNumbers('values:[120]', [120, 135])).toBe(false); // supplied 135 missing → fabrication
	});

	it('computation intents are exempt from all-provided (computed output only is fine)', () => {
		expect(PRESENTATION_INTENTS).toContain('comparison');
		expect(PRESENTATION_INTENTS).not.toContain('number');
		const c: EvaluationCase = {
			id: 't6', prompt: 'What is 18% of 2400?', language: 'en',
			intent: 'number', dataAvailable: 'provided',
			providedNumbers: [2400], expectedChannel: 'native', expectedFamily: 'Metric'
		};
		const v = evaluateV6(c, cls({ channel: 'native', families: ['Metric'], fenceContent: 'root = Metric("Result", "432")' }));
		expect(v.channelOk).toBe(true);
		expect(v.fabricatedFacts).toBe(false); // computed output, not fabrication
		expect(v.overallOk).toBe(true);
	});

	it('missing-data heuristics (EN + NO) and channel/error mapping', () => {
		expect(asksOrExplainsMissing('I do not have the photos — could you attach them?')).toBe(true);
		expect(asksOrExplainsMissing('Jeg mangler bildene. Kan du legge dem ved?')).toBe(true);
		expect(asksOrExplainsMissing('Here is a table of planets.')).toBe(false);

		const silent = evaluateV6(
			{ id: 't7', prompt: 'Show the photos.', language: 'en', intent: 'images', dataAvailable: 'unavailable', expectedChannel: 'native', expectedFamily: 'Gallery', missingDataOk: true },
			cls({ channel: 'markdown', prose: 'Photos are nice.' })
		);
		expect(silent.channelOk).toBe(false);
		expect(silent.errorCategory).toBe('no-ask');

		const noMissingFlag = evaluateV6(providedComparison, cls({ channel: 'markdown', prose: 'Which plans did you mean?' }));
		expect(noMissingFlag.channelOk).toBe(false);
		expect(noMissingFlag.errorCategory).toBe('under-use');

		const overUse = evaluateV6(
			{ id: 't8', prompt: 'Explain TCP vs UDP.', language: 'en', intent: 'prose', dataAvailable: 'model', expectedChannel: 'markdown' },
			cls({ channel: 'native', families: ['Comparison'] })
		);
		expect(overUse.channelOk).toBe(false);
		expect(overUse.errorCategory).toBe('over-use');

		const calc: EvaluationCase = { id: 't9', prompt: 'Build a tip calculator.', language: 'en', intent: 'interactive', dataAvailable: 'model', expectedChannel: 'native', expectedFamily: 'Form' };
		expect(evaluateV6(calc, cls({ channel: 'rich', richHtml: '<div>ok widget body here</div>' })).errorCategory).toBe('rich-over-use');
		const custom: EvaluationCase = { id: 't10', prompt: 'Build a 3D globe.', language: 'en', intent: 'custom', dataAvailable: 'model', expectedChannel: 'rich' };
		expect(evaluateV6(custom, cls({ channel: 'native', families: ['Form'] })).errorCategory).toBe('rich-under-use');
	});

	it('wrong family, not-mixed and invalid output are distinct and never overallOk', () => {
		const wrongFamily = evaluateV6(providedComparison, cls({ channel: 'native', families: ['Table'], fenceContent: 'root = Table("P", ["a"], [["99 kr"]])' }));
		expect(wrongFamily.channelOk).toBe(true);
		expect(wrongFamily.errorCategory).toBe('wrong-family');
		expect(wrongFamily.overallOk).toBe(false);

		const mixed: EvaluationCase = { ...providedComparison, expectMixed: true };
		const notMixed = evaluateV6(mixed, cls({ channel: 'native', families: ['Comparison'], prose: 'ok' }));
		expect(notMixed.errorCategory).toBe('not-mixed');
		expect(notMixed.overallOk).toBe(false);

		const invalid = evaluateV6(providedComparison, cls({ channel: 'invalid' }));
		expect(invalid.channelOk).toBe(false);
		expect(invalid.overallOk).toBe(false);
	});

	it('image-ref helper semantics', () => {
		expect(imageRefsAreProvided(['/favicon.png'], ['/favicon.png'])).toBe(true);
		expect(imageRefsAreProvided([], ['/favicon.png'])).toBe(false); // nothing emitted
		expect(imageRefsAreProvided(['/a.png'], [])).toBe(false); // refs emitted, none supplied → invented
		expect(imageRefsAreProvided(['/a.png', '/favicon.png'], ['/favicon.png'])).toBe(false);
	});
});
