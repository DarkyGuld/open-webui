/**
 * Benchmark model registry and execution guards.
 *
 * Pure and offline: no network, no secrets, no model calls. The routing benchmark
 * runner imports this so that model selection, tier guards and comparability are
 * decided in one testable place instead of inline in the runner.
 *
 * Tiers:
 * - `paid`   — metered model. Requires an explicit paid-approval flag.
 * - `free`   — limited-time free endpoint. Requires a free acknowledgment because
 *               the endpoint can be replaced or withdrawn, and because free-model
 *               results are NOT comparable with the paid historical series.
 */
export type BenchTier = 'free' | 'paid';

/**
 * Which measured series a model's result belongs to.
 * - `historic-free` — part of the cat-jam-free pilot series (v6/v7/v8 pilots).
 * - `historic-paid` — part of the deepseek-v4.1-flash series (M9.5–M9.9).
 * - `new-free`      — a free endpoint that has no measured history; its result is a
 *                     standalone measurement and must not be compared with the
 *                     historical series.
 */
export type BenchSeries = 'historic-free' | 'historic-paid' | 'new-free';

export interface BenchModel {
	id: string;
	tier: BenchTier;
	series: BenchSeries;
	/** Default endpoint for this model. The runner may override it with BENCH_BASE_URL. */
	endpoint: string;
	/** Human-readable caveat that must be copied into the result documentation. */
	note: string;
}

const GO_ENDPOINT = 'https://opencode.ai/inference/go/openai/v1/chat/completions';
const CONSOLE_ENDPOINT = 'https://opencode.ai/inference/openai/v1/chat/completions';

export const BENCH_MODELS: Record<string, BenchModel> = {
	'cat-jam-free': {
		id: 'cat-jam-free',
		tier: 'free',
		series: 'historic-free',
		endpoint: GO_ENDPOINT,
		note: 'Historic free pilot model. Limited-time endpoint; it may no longer be served.'
	},
	'deepseek-v4.1-flash': {
		id: 'deepseek-v4.1-flash',
		tier: 'paid',
		series: 'historic-paid',
		endpoint: GO_ENDPOINT,
		note: 'Metered model of the historical paid series. Comparable with M9.5–M9.9 results.'
	},
	'minimax-m3.1-flash-free': {
		id: 'minimax-m3.1-flash-free',
		tier: 'free',
		series: 'new-free',
		endpoint: GO_ENDPOINT,
		note: 'Limited-time free endpoint (unlimited monthly allowance). Zero-retention, no training. Not comparable with the historical series.'
	},
	'longcat-2.5-preview-free': {
		id: 'longcat-2.5-preview-free',
		tier: 'free',
		series: 'new-free',
		endpoint: GO_ENDPOINT,
		note: 'Limited-time free endpoint (unlimited monthly allowance). Zero-retention, no training. Not comparable with the historical series.'
	},
	'beam-free': {
		id: 'beam-free',
		tier: 'free',
		series: 'new-free',
		endpoint: GO_ENDPOINT,
		note: 'Limited-time free endpoint, region-restricted, retains data for 30 days. Not comparable with the historical series.'
	},
	'deepseek-v4.1-flash-free': {
		id: 'deepseek-v4.1-flash-free',
		tier: 'free',
		series: 'new-free',
		endpoint: CONSOLE_ENDPOINT,
		note: 'Limited-time free endpoint on the pay-as-you-go gateway (billing details required, no cost). Not comparable with the metered deepseek series.'
	}
};

export interface BenchRequest {
	model: string;
	runs: number;
	execute: boolean;
	paidApproved: boolean;
	freeAcknowledged: boolean;
	key: string;
	baseUrl?: string;
}

export type BenchDecision =
	| { ok: true; model: BenchModel; endpoint: string; acknowledgment: 'none' | 'free' | 'paid' }
	| { ok: false; error: string };

/**
 * Decide whether a benchmark run may proceed. Never performs I/O.
 * Guard order is stable so that the most specific refusal reason is reported.
 */
export function decideBenchRun(request: BenchRequest): BenchDecision {
	const model = BENCH_MODELS[request.model];
	if (!model) {
		return {
			ok: false,
			error: `Unapproved benchmark model: ${request.model}. Allowed: ${Object.keys(BENCH_MODELS).join(', ')}`
		};
	}
	if (!Number.isInteger(request.runs) || request.runs < 1 || request.runs > 3) {
		return { ok: false, error: 'BENCH_RUNS must be 1–3' };
	}
	if (request.execute && model.tier === 'paid' && !request.paidApproved) {
		return {
			ok: false,
			error: 'Paid calls require explicit user approval before setting BENCH_PAID_APPROVED=1'
		};
	}
	if (request.execute && model.tier === 'free' && !request.freeAcknowledged) {
		return {
			ok: false,
			error:
				'Free endpoints require BENCH_FREE_ACKNOWLEDGED=1: the endpoint is limited-time and its results are not comparable with the paid historical series.'
		};
	}
	if (request.execute && !request.key) {
		return { ok: false, error: 'Missing OPENCODE_KEY' };
	}
	return {
		ok: true,
		model,
		endpoint: request.baseUrl || model.endpoint,
		acknowledgment: !request.execute ? 'none' : model.tier === 'paid' ? 'paid' : 'free'
	};
}

/** Comparability of a result against the historical paid/free series. */
export function isComparableToSeries(model: BenchModel, series: BenchSeries): boolean {
	return model.series === series;
}
