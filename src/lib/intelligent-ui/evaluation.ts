/**
 * Versioned evaluation contract for Intelligent UI routing benchmarks.
 *
 * **v8 (final production-readiness hardening of v7)** — closes the v7 gaps
 * found in adversarial review:
 *   1. Sign-context numeric matching: a leading `-` is a SIGN only when not
 *      preceded by a digit/separator; a range/minus dash (`50000-500500`) is
 *      UNSIGNED only. A supplied negative value therefore never matches a
 *      positive token and vice versa (v7 accepted both — a false pass).
 *   2. Authorized retrieval credit requires the response's query sources to
 *      validate against the REAL allow-list (`queries.ts` QUERY_IDS) — "the UI
 *      references a query" is not enough, and an unknown source id is not
 *      trusted data. Retrieval credit means an authorized retrieval PATH (the
 *      load itself executes at render time, browser-verified).
 *   3. Rich Widget validation uses the REAL production safety contract
 *      (`rich-contract.ts`: CSP + sandbox flags shared with the renderer) —
 *      forms/popups/downloads are sandbox-blocked, network is CSP-blocked —
 *      not a regex approximation. Static validation still cannot prove a
 *      widget *executes*; that is a separate browser-verified step.
 *   4. `factCheck` is an explicit, separately reported dimension: `verified`
 *      (all supplied facts were shown), `unverified` (computation arithmetic /
 *      model-known facts / retrieved content cannot be statically verified) —
 *      so numeric token matching is never presented as proof of factual
 *      correctness.
 *
 * v7 (post-review of v6): all-supplied matching, no substring false
 * positives, unavailable-data rules, invented-src detection, rich presence
 * validation, `overallOk`.
 *
 * Pure functions — the benchmark runners (`audit/lib/routing-benchmark-v6.mts`)
 * and Vitest use the SAME contract. Historical benchmark results (v1–v5) stay
 * untouched and comparable.
 */

import { QUERY_IDS } from './queries';
import { validateRichWidgetHtml } from './rich-contract';

export const EVAL_CONTRACT_VERSION = 8;

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
	/** `source` ids of Data (query) nodes emitted in a native response. */
	querySources: string[];
	/** The OpenUI Lang inside the native fence ('' when no fence). */
	fenceContent: string;
	/** The HTML inside the rich fence ('' when no rich fence). */
	richHtml: string;
	/** Prose outside the fences (for mixed/ask detection). */
	prose: string;
	jsLeaks: string[];
}

export interface V6Verdict {
	/** Everything verifiable is correct: channel + family + mixed + no
	 *  fabrication + valid output + (when claimed) authorized retrieval. */
	overallOk: boolean;
	channelOk: boolean;
	familyOk: boolean;
	mixedOk: boolean;
	/** Supplied numbers ignored, or image sources invented. */
	fabricatedFacts: boolean;
	/** Native answer claims authorized retrieval (Query present AND every
	 *  source id is on the real allow-list). Retrieval PATH credit only — the
	 *  load itself executes at render time (browser-verified), not here. */
	authorizedRetrieval: boolean;
	/** The response asked for / explained missing data (markdown path). */
	askedForMissingData: boolean;
	/** The rich widget failed the REAL production safety contract. */
	richInvalid: boolean;
	/** Factual correctness: 'verified' (all supplied facts shown) or
	 *  'unverified' (computation/model-known/retrieved content cannot be
	 *  statically verified). Never presented as proof of correctness. */
	factCheck: 'verified' | 'unverified';
	errorCategory: string | null;
}

const ASK_RE =
	/\?|\b(attach|attached|send|share|provide|missing|unavailable|not available|don't have|do not have|need (the|more)|legg ved|vedlegg|send|del|mangler|ikke tilgjengelig|har ikke)\b/i;

/** Heuristic: a markdown answer that asks for or explains missing data. */
export function asksOrExplainsMissing(content: string): boolean {
	return ASK_RE.test(content);
}

// --- numeric token extraction / normalization (no substring matching) ---

/**
 * Parse one space-free numeric segment into its plausible values.
 * `120,000`/`120.000` (thousands), `1,2`/`1.2`/`1.20` (decimals). The sign is
 * decided by the CALLER (extractNumberTokens) from source context — a leading
 * `-` is a sign only when not preceded by a digit/separator; otherwise it is a
 * range/minus dash and the value is positive. A supplied negative therefore
 * never matches a positive token and vice versa.
 */
function segmentCandidates(segment: string, signed: boolean): number[] {
	const token = segment.replace(/_/g, '');
	const magnitude = token.startsWith('-') ? token.slice(1) : token;
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
	return [...out];
}

/**
 * All plausible numeric values for one raw token. Separator runs are ambiguous:
 * `120 000` (thousands) vs `112 12 1200` (separate numbers), and crucially
 * `values:[120,135,150]` (an OpenUI array) vs `120,000` (thousands) — so BOTH
 * interpretations are returned: the whole run AND each comma/space sub-segment.
 * `signContext` ('sign' | 'range') decides whether a leading `-` negates.
 */
export function numericCandidates(rawToken: string, signContext: 'sign' | 'range' = 'sign'): number[] {
	const out = new Set<number>();
	const hasDash = rawToken.startsWith('-');
	for (const n of segmentCandidates(rawToken.replace(/[\s]/g, ''), hasDash && signContext === 'sign'))
		out.add(n);
	for (const seg of rawToken.split(/[\s,]+/)) {
		if (!seg || !/\d/.test(seg)) continue;
		for (const n of segmentCandidates(seg, seg.startsWith('-') && signContext === 'sign')) out.add(n);
	}
	return [...out];
}

/**
 * All plausible numeric values appearing in the text (whole tokens only), with
 * sign decided from source context: a `-` directly after a DIGIT
 * (`50000-500500`, `5-10`) is a range/minus dash (unsigned); after anything
 * else (space, comma, bracket, colon) it is a sign, so `values:[-0.16,-0.05]`
 * keeps its negative array values negative.
 */
export function extractNumberTokens(text: string): number[] {
	const out: number[] = [];
	for (const m of text.matchAll(/-?\d+(?:[.,_]\d+)*(?:\s\d+(?:[.,_]\d+)*)*/g)) {
		const dash = m[0].startsWith('-');
		const prev = dash ? text[m.index! - 1] : '';
		const signContext: 'sign' | 'range' = dash && prev && /\d/.test(prev) ? 'range' : 'sign';
		out.push(...numericCandidates(m[0], signContext));
	}
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

/**
 * Every query `source` id emitted in the response is on the REAL allow-list
 * (`queries.ts` QUERY_IDS). "The UI references a query" alone is not enough —
 * an unknown source id is not trusted data. At least one source must exist.
 * (Retrieval PATH credit: the load itself executes at render time.)
 */
export function authorizedQuerySources(sources: string[]): boolean {
	if (!sources?.length) return false;
	return sources.every((s) => (QUERY_IDS as readonly string[]).includes(s));
}

// --- Rich Widget validation (the REAL production safety contract) ---

/**
 * Validate a rich-widget body against the REAL safety contract shared with the
 * production renderer (`rich-contract.ts`: CSP + sandbox flags) — forms,
 * popups, downloads and network are all blocked there, so a widget needing
 * them is broken. STATIC validation: it cannot prove the widget executes —
 * functional verification is a separate, browser-verified step.
 */
export function validateRichWidget(html: string): { valid: boolean; reason: string } {
	return validateRichWidgetHtml(html);
}

// --- verdict ---

export function evaluateV6(c: EvaluationCase, r: ResponseClassification): V6Verdict {
	const asked = r.channel === 'markdown' && asksOrExplainsMissing(r.prose);
	const richCheck = r.channel === 'rich' ? validateRichWidget(r.richHtml) : { valid: true, reason: '' };
	const richInvalid = r.channel === 'rich' && !richCheck.valid;
	// Authorized retrieval: a Query component is present AND every emitted
	// source id is on the real allow-list (retrieval PATH credit — the load
	// executes at render time, browser-verified there, not here).
	const authorizedRetrieval =
		r.channel === 'native' && r.families.includes('Query') && authorizedQuerySources(r.querySources);

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
		// required data are unavailable, a native answer is correct ONLY with a
		// verified authorized retrieval path (allow-listed sources, no invention).
		channelOk =
			c.dataAvailable !== 'unavailable' ||
			(authorizedRetrieval && !r.srcs.length && !c.providedNumbers?.length);
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

	// Factual correctness, honestly labeled. 'verified' only when the supplied
	// facts were all shown (presentation) — computation arithmetic, model-known
	// facts and retrieved content CANNOT be statically verified and are labeled
	// 'unverified' rather than pretending token matching proves correctness.
	const factCheck: 'verified' | 'unverified' = numbersFabricated
		? 'unverified'
		: r.channel === 'native' &&
				PRESENTATION_INTENTS.includes(c.intent) &&
				!!c.providedNumbers?.length &&
				usedProvidedNumbers(r.fenceContent, c.providedNumbers)
			? 'verified'
			: 'unverified';

	// Overall success: every VERIFIABLE dimension correct (channel + family +
	// mixed + no fabrication + valid output + honest retrieval claim). Factual
	// correctness of computation/model-known/retrieved content is reported
	// separately via factCheck and is never silently claimed.
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
		authorizedRetrieval,
		askedForMissingData: asked,
		richInvalid,
		factCheck,
		errorCategory
	};
}
