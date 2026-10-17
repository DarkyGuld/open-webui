/**
 * Versioned evaluation contract for Intelligent UI routing benchmarks (v6).
 *
 * v6 separates what older benchmarks conflated:
 *   - user PRESENTATION INTENT (what shape of answer helps),
 *   - DATA AVAILABILITY (provided in the prompt / known to the model / queryable
 *     from an allow-listed source / unavailable),
 *   - whether the model ASKED FOR or EXPLAINED missing data instead of guessing,
 *   - FABRICATION (provided numbers ignored, or image sources invented),
 *   - the usual channel/family/mixed/rich dimensions.
 *
 * Pure functions — no dependencies — so both the benchmark runners
 * (`audit/lib/routing-benchmark-v6.mts`) and Vitest use the SAME contract.
 * Historical benchmark results (v1–v5) stay untouched and comparable.
 */

export const EVAL_CONTRACT_VERSION = 6;

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

export interface EvaluationCase {
	id: string;
	prompt: string;
	language: 'en' | 'no';
	intent: PresentationIntent;
	dataAvailable: DataAvailability;
	/** Numbers supplied in the prompt that a correct native answer must use. */
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
	/** Gallery `src` values when a native Gallery was emitted. */
	srcs: string[];
	/** The OpenUI Lang inside the fence ('' when no fence). */
	fenceContent: string;
	/** Prose outside the fences (for mixed/ask detection). */
	prose: string;
	jsLeaks: string[];
}

export interface V6Verdict {
	channelOk: boolean;
	familyOk: boolean;
	mixedOk: boolean;
	/** Provided numbers were ignored or image sources were invented. */
	fabricatedFacts: boolean;
	/** The response asked for / explained missing data (markdown path). */
	askedForMissingData: boolean;
	errorCategory: string | null;
}

const ASK_RE =
	/\?|\b(attach|attached|send|share|provide|missing|unavailable|not available|don't have|do not have|need (the|more)|legg ved|vedlegg|send|del|mangler|ikke tilgjengelig|har ikke)\b/i;

/** Heuristic: a markdown answer that asks for or explains missing data. */
export function asksOrExplainsMissing(content: string): boolean {
	return ASK_RE.test(content);
}

/** At least one provided number appears in the emitted OpenUI Lang.
 *  Formatting-insensitive: `120000` matches `120 000` / `120_000` / `120,000`
 *  (separators stripped), and `1.2` matches `1,2` (decimal comma). */
export function usedProvidedNumbers(
	fenceContent: string,
	provided: (string | number)[]
): boolean {
	if (!provided?.length) return true;
	const stripped = fenceContent.replace(/[\s,_]/g, '');
	return provided.some((n) => {
		const s = String(n);
		if (stripped.includes(s)) return true;
		if (s.includes('.') && fenceContent.includes(s.replace('.', ','))) return true;
		return false;
	});
}

/** Every emitted Gallery src is one of the provided refs (no invented sources). */
export function imageRefsAreProvided(srcs: string[], provided: string[]): boolean {
	if (!srcs?.length) return false;
	if (!provided?.length) return false;
	return srcs.every((s) => provided.includes(s));
}

export function evaluateV6(c: EvaluationCase, r: ResponseClassification): V6Verdict {
	const asked = r.channel === 'markdown' && asksOrExplainsMissing(r.prose);

	let channelOk: boolean;
	if (c.expectedChannel === 'markdown') {
		channelOk = r.channel === 'markdown';
	} else if (c.expectedChannel === 'rich') {
		channelOk = r.channel === 'rich';
	} else {
		// expected native: native UI, OR (when data are unavailable) a markdown
		// answer that asks for / explains the missing data.
		channelOk = r.channel === 'native' || (r.channel === 'markdown' && !!c.missingDataOk && asked);
	}

	const familyOk =
		c.expectedChannel === 'native'
			? channelOk && (r.channel !== 'native' || (!c.expectedFamily || r.families.includes(c.expectedFamily)))
			: channelOk;

	const mixedOk = c.expectMixed ? r.channel === 'native' && r.prose.trim().length > 40 : true;

	const fabricated =
		r.channel === 'native' &&
		((!!c.providedNumbers?.length && !usedProvidedNumbers(r.fenceContent, c.providedNumbers)) ||
			(c.intent === 'images' &&
				!!c.providedImageRefs?.length &&
				!imageRefsAreProvided(r.srcs, c.providedImageRefs)));

	let errorCategory: string | null = null;
	if (!channelOk) {
		if (r.channel === 'invalid') errorCategory = 'invalid';
		else if (c.expectedChannel === 'native' && r.channel === 'markdown')
			errorCategory = c.missingDataOk && !asked ? 'no-ask' : 'under-use';
		else if (c.expectedChannel === 'native' && r.channel === 'rich') errorCategory = 'rich-over-use';
		else if (c.expectedChannel === 'markdown' && r.channel !== 'markdown') errorCategory = 'over-use';
		else if (c.expectedChannel === 'rich' && r.channel !== 'rich') errorCategory = 'rich-under-use';
		else errorCategory = 'other';
	} else if (c.expectedChannel === 'native' && r.channel === 'native' && !familyOk) {
		errorCategory = 'wrong-family';
	} else if (c.expectMixed && !mixedOk) {
		errorCategory = 'not-mixed';
	} else if (fabricated) {
		errorCategory = 'fabricated';
	}

	return { channelOk, familyOk, mixedOk, fabricatedFacts: fabricated, askedForMissingData: asked, errorCategory };
}
