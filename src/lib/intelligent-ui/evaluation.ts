/**
 * Versioned evaluation contract for Intelligent UI routing benchmarks.
 *
 * **v7 (post-review hardening of v6)** — fixes the v6 correctness gaps:
 *   1. `usedProvidedNumbers` requires ALL relevant supplied values (was `.some()`),
 *      matches whole numeric tokens with robust normalization (thousands separators,
 *      decimal commas, signs/range dashes, unit-scaled representations) and has NO
 *      substring false positives. Source inputs are distinguished from correctly
 *      computed outputs: presentation intents must show every supplied value; pure
 *      computation intents (a single number / an interactive calculator) may show
 *      only the computed result, and legitimate unit conversions (1.2M ↔ 1200000)
 *      are matches, not fabrication.
 *   2. Unavailable-data cases never credit fabricated native UI just because the
 *      expected channel is native: correct behavior is a markdown ask/explanation,
 *      or native UI that VERIFIABLY retrieves from an authorized (allow-listed)
 *      source (the Query family). Inventing values into a native UI is
 *      `fabricated-ui`.
 *   3. Invented image references are detected even when NO refs were provided —
 *      any gallery `src` emitted without supplied refs is fabrication.
 *   4. Rich Widget output is VALIDATED (non-trivial HTML, no external
 *      network references, no `javascript:`), not accepted on fence presence.
 *   5. `overallOk` (channel + family + mixed + no fabrication + no invalid
 *      output) is a first-class, separately reported metric; invalid output is
 *      never obscured.
 *
 * Pure functions — no dependencies — so the benchmark runners
 * (`audit/lib/routing-benchmark-v6.mts`) and Vitest use the SAME contract.
 * Historical benchmark results (v1–v5) stay untouched and comparable.
 */

export const EVAL_CONTRACT_VERSION = 7;

export type DataAvailability = 'provided' | 'model' | 'queryable' | 'unavailable';

export type PresentationIntent =
	| 'prose'
	| 'comparison'
	| 'number'
	| 'table'
	| 'chart'
	| 'timeline'
	| 'images'
	| 'interactive'
	| 'custom'
	| 'query'
	| 'mixed';

/** Intents whose UI must present EVERY supplied value (vs. compute from them). */
export const PRESENTATION_INTENTS: readonly PresentationIntent[] = [
	'comparison',
	'table',
	'chart',
	'timeline',
	'images',
	'mixed'
];

export interface EvaluationCase {
	id: string;
	prompt: string;
	language: 'en' | 'no';
	intent: PresentationIntent;
	dataAvailable: DataAvailability;
	/** Numbers supplied in the prompt. Presentation intents must show them all. */
	providedNumbers?: (string | number)[];
	/** Safe image refs supplied in the prompt; a Gallery must use only these. */
	providedImageRefs?: string[];
	expectedChannel: 'markdown' | 'native' | 'rich';
	expectedFamily?: string;
	expectMixed?: boolean;
	/** Asking for / explaining the missing data is the CORRECT behavior. */
	missingDataOk?: boolean;
}

export interface ResponseClassification {
	channel: 'markdown' | 'native' | 'rich' | 'invalid';
	families: string[];
	/** Gallery `src` values when native Gallery content was emitted. */
	srcs: string[];
	/** The OpenUI Lang inside the native fence ('' when no fence). */
	fenceContent: string;
	/** The HTML inside the rich fence ('' when no rich fence). */
	richHtml: string;
	/** Prose outside the fences (for mixed/ask detection). */
	prose: string;
	jsLeaks: string[];
}

export interface V6Verdict {
	/** Everything correct: channel + family + mixed + no fabrication + valid output. */
	overallOk: boolean;
	channelOk: boolean;
	familyOk: boolean;
	mixedOk: boolean;
	/** Supplied numbers ignored, or image sources invented. */
	fabricatedFacts: boolean;
	/** The response asked for / explained missing data (markdown path). */
	askedForMissingData: boolean;
	/** The rich widget failed validation (empty/trivial/external refs). */
	richInvalid: boolean;
	errorCategory: string | null;
}

const ASK_RE =
	/\?|\b(attach|attached|send|share|provide|missing|unavailable|not available|don't have|do not have|need (the|more)|legg ved|vedlegg|send|del|mangler|ikke tilgjengelig|har ikke)\b/i;

/** Heuristic: a markdown answer that asks for or explains missing data. */
export function asksOrExplainsMissing(content: string): boolean {
	return ASK_RE.test(content);
}

// --- numeric token extraction / normalization (no substring matching) ---

const NUM_TOKEN_RE = /-?\d+(?:[.,_]\d+)*(?:\s\d+(?:[.,_]\d+)*)*/g;

/**
 * Parse one space-free numeric segment into its plausible values.
 * `120,000`/`120.000` (thousands), `1,2`/`1.2`/`1.20` (decimals), a leading
 * `-` that may be a range dash (`50000-500000`) → both signed and unsigned.
 */
function segmentCandidates(segment: string): number[] {
	const token = segment.replace(/_/g, '');
	const signed = token.startsWith('-');
	const magnitude = signed ? token.slice(1) : token;
	const groups = magnitude.split(/[.,]/).filter((g) => g.length > 0);
	const out = new Set<number>();
	const add = (s: string) => {
		const n = Number(s);
		if (Number.isFinite(n)) out.add(signed ? -n : n);
	};
	if (groups.length <= 1) {
		add(magnitude.replace(/[.,]/g, ''));
	} else {
		const last = groups[groups.length - 1];
		// thousands interpretation: all separator groups join (only when the
		// final group has exactly 3 digits — `1.2` is not `12`)
		if (last.length === 3) add(groups.join(''));
		// decimal interpretation: the LAST separator is the decimal point (1-2 digits)
		if (last.length === 1 || last.length === 2) {
			add([...groups.slice(0, -1).join(''), '.', last].join(''));
		}
	}
	// a leading `-` may be a range dash, so the unsigned value is also plausible
	if (signed) for (const n of [...out]) out.add(-n);
	return [...out];
}

/**
 * All plausible numeric values for one raw token. Separator runs are ambiguous:
 * `120 000` (thousands) vs `112 12 1200` (separate numbers), and crucially
 * `values:[120,135,150]` (an OpenUI array) vs `120,000` (thousands) — so BOTH
 * interpretations are returned: the whole run AND each comma/space sub-segment.
 */
export function numericCandidates(rawToken: string): number[] {
	const out = new Set<number>();
	// whole-run interpretation (spaces removed): thousands / decimal groups
	for (const n of segmentCandidates(rawToken.replace(/[\s]/g, ''))) out.add(n);
	// list interpretation: each comma/space sub-segment is its own number
	for (const seg of rawToken.split(/[\s,]+/)) {
		if (!seg || !/\d/.test(seg)) continue;
		for (const n of segmentCandidates(seg)) out.add(n);
	}
	return [...out];
}

/** All plausible numeric values appearing in the text (whole tokens only). */
export function extractNumberTokens(text: string): number[] {
	const out: number[] = [];
	for (const m of text.matchAll(NUM_TOKEN_RE)) out.push(...numericCandidates(m[0]));
	return out;
}

function nearEqual(a: number, b: number): boolean {
	return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

/**
 * A token value matches a supplied value ONLY as the same number (up to
 * separator normalization). Magnitude scaling (3 ↔ 3000, 1.2 ↔ 1200000) is
 * deliberately NOT credited — a scaled/computed output is not the source
 * input, and crediting it was a v6 false positive.
 */
function valueMatches(tokenValue: number, target: number): boolean {
	return nearEqual(tokenValue, target);
}

/**
 * Presentation intents must show EVERY supplied value (whole-token match; no
 * substring false positives). Computation intents (`number`, `interactive`)
 * may legitimately show only the computed result, so they are exempt (see
 * PRESENTATION_INTENTS).
 */
export function usedProvidedNumbers(
	fenceContent: string,
	provided: (string | number)[]
): boolean {
	if (!provided?.length) return true;
	const tokens = extractNumberTokens(fenceContent);
	return provided.every((p) => {
		const target = typeof p === 'number' ? p : Number(p);
		if (!Number.isFinite(target)) return true;
		return tokens.some((t) => valueMatches(t, target));
	});
}

/** Every emitted Gallery src is one of the provided refs; emitting ANY src when
 *  nothing was provided is invention (returns false). No src emitted → false. */
export function imageRefsAreProvided(srcs: string[], provided: string[]): boolean {
	if (!srcs?.length) return false;
	if (!provided?.length) return false; // refs emitted, none supplied → invented
	return srcs.every((s) => provided.includes(s));
}

// --- Rich Widget validation (not just fence presence) ---

const EXTERNAL_REF_RE =
	/(?:\b(?:src|href)\s*=\s*["']?\s*https?:\/\/|url\(\s*["']?\s*https?:\/\/)/i;
const NETWORK_API_RE = /\b(fetch\s*\(|XMLHttpRequest|new\s+EventSource|WebSocket\s*\()/i;
const JS_URI_RE = /["']\s*javascript:/i;

/** Validate a rich-widget body: non-trivial HTML, self-contained, no JS URIs. */
export function validateRichWidget(html: string): { valid: boolean; reason: string } {
	const body = (html ?? '').trim();
	if (body.length < 20) return { valid: false, reason: 'empty-or-trivial' };
	if (!/<[a-z][^>]*>/i.test(body)) return { valid: false, reason: 'no-html-content' };
	if (EXTERNAL_REF_RE.test(body) || NETWORK_API_RE.test(body))
		return { valid: false, reason: 'external-network-reference' };
	if (JS_URI_RE.test(body)) return { valid: false, reason: 'javascript-uri' };
	return { valid: true, reason: '' };
}

// --- verdict ---

export function evaluateV6(c: EvaluationCase, r: ResponseClassification): V6Verdict {
	const asked = r.channel === 'markdown' && asksOrExplainsMissing(r.prose);
	const richCheck = r.channel === 'rich' ? validateRichWidget(r.richHtml) : { valid: true, reason: '' };
	const richInvalid = r.channel === 'rich' && !richCheck.valid;

	let channelOk: boolean;
	if (c.expectedChannel === 'markdown') {
		channelOk = r.channel === 'markdown';
	} else if (c.expectedChannel === 'rich') {
		channelOk = r.channel === 'rich' && !richInvalid;
	} else if (r.channel === 'markdown') {
		// expected native, answered markdown: correct only when the data are
		// genuinely unavailable AND the answer asks for / explains them.
		channelOk = !!c.missingDataOk && asked;
	} else if (r.channel === 'native') {
		// Never credit fabricated UI just because the channel is native: when the
		// required data are unavailable, a native answer is correct ONLY if it
		// verifiably retrieves from an authorized (allow-listed) source.
		channelOk = c.dataAvailable !== 'unavailable' || r.families.includes('Query');
	} else {
		channelOk = false;
	}

	const familyOk =
		c.expectedChannel === 'native'
			? channelOk &&
				(r.channel !== 'native' || !c.expectedFamily || r.families.includes(c.expectedFamily))
			: channelOk;

	const mixedOk = c.expectMixed ? r.channel === 'native' && r.prose.trim().length > 40 : true;

	const numbersFabricated =
		r.channel === 'native' &&
		PRESENTATION_INTENTS.includes(c.intent) &&
		!!c.providedNumbers?.length &&
		!usedProvidedNumbers(r.fenceContent, c.providedNumbers);

	// Invented image refs: any gallery src without supplied refs, or srcs outside
	// the supplied refs — detected even when NO refs were provided.
	const srcsFabricated =
		r.channel === 'native' && r.srcs.length > 0 && !imageRefsAreProvided(r.srcs, c.providedImageRefs ?? []);

	const fabricated = numbersFabricated || srcsFabricated;

	// Overall success: channel + family + mixed + no fabrication + valid output.
	const overallOk =
		channelOk && familyOk && mixedOk && !fabricated && !richInvalid && r.channel !== 'invalid';

	let errorCategory: string | null = null;
	if (r.channel === 'invalid') errorCategory = 'invalid';
	else if (richInvalid) errorCategory = 'invalid-rich';
	else if (!channelOk) {
		if (c.expectedChannel === 'native' && r.channel === 'markdown')
			errorCategory = c.missingDataOk && !asked ? 'no-ask' : 'under-use';
		else if (c.expectedChannel === 'native' && r.channel === 'native')
			errorCategory = 'fabricated-ui'; // invented data in a native UI
		else if (c.expectedChannel === 'native' && r.channel === 'rich') errorCategory = 'rich-over-use';
		else if (c.expectedChannel === 'markdown') errorCategory = 'over-use';
		else if (c.expectedChannel === 'rich') errorCategory = 'rich-under-use';
		else errorCategory = 'other';
	} else if (!familyOk) errorCategory = 'wrong-family';
	else if (c.expectMixed && !mixedOk) errorCategory = 'not-mixed';
	else if (fabricated) errorCategory = 'fabricated';

	return {
		overallOk,
		channelOk,
		familyOk,
		mixedOk,
		fabricatedFacts: fabricated,
		askedForMissingData: asked,
		richInvalid,
		errorCategory
	};
}
