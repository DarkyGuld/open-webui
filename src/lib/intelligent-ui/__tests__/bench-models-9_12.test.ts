import { describe, it, expect } from 'vitest';
import {
	BENCH_MODELS,
	decideBenchRun,
	isComparableToSeries,
	type BenchRequest
} from '../../../../scripts/intelligent-ui/bench-models';

const base: BenchRequest = {
	model: 'minimax-m3.1-flash-free',
	runs: 3,
	execute: true,
	paidApproved: false,
	freeAcknowledged: false,
	key: 'synthetic-test-key'
};

describe('benchmark model registry and guards (offline)', () => {
	it('knows only reviewed models', () => {
		expect(Object.keys(BENCH_MODELS)).toEqual(
			expect.arrayContaining([
				'cat-jam-free',
				'deepseek-v4.1-flash',
				'minimax-m3.1-flash-free',
				'longcat-2.5-preview-free',
				'beam-free',
				'deepseek-v4.1-flash-free'
			])
		);
		for (const model of Object.values(BENCH_MODELS)) {
			expect(model.note.length).toBeGreaterThan(10);
			expect(model.endpoint).toMatch(/^https:\/\//);
		}
	});
	it('refuses an unapproved model', () => {
		const decision = decideBenchRun({ ...base, model: 'gpt-5.6' });
		expect(decision.ok).toBe(false);
		if (!decision.ok) expect(decision.error).toContain('Unapproved benchmark model');
	});
	it('requires the paid approval flag for metered models', () => {
		const without = decideBenchRun({ ...base, model: 'deepseek-v4.1-flash' });
		expect(without.ok).toBe(false);
		if (!without.ok) expect(without.error).toContain('Paid calls require explicit user approval');
		const with_ = decideBenchRun({ ...base, model: 'deepseek-v4.1-flash', paidApproved: true });
		expect(with_.ok).toBe(true);
		if (with_.ok) expect(with_.acknowledgment).toBe('paid');
	});
	it('requires an explicit acknowledgment for free endpoints', () => {
		const without = decideBenchRun(base);
		expect(without.ok).toBe(false);
		if (!without.ok) expect(without.error).toContain('BENCH_FREE_ACKNOWLEDGED=1');
		const acknowledged = decideBenchRun({ ...base, freeAcknowledged: true });
		expect(acknowledged.ok).toBe(true);
		if (acknowledged.ok) {
			expect(acknowledged.acknowledgment).toBe('free');
			expect(acknowledged.model.tier).toBe('free');
		}
	});
	it('never lets a free endpoint pass the paid flag, or a paid one the free flag', () => {
		expect(decideBenchRun({ ...base, paidApproved: true, freeAcknowledged: false }).ok).toBe(false);
		expect(
			decideBenchRun({
				...base,
				model: 'deepseek-v4.1-flash',
				paidApproved: false,
				freeAcknowledged: true
			}).ok
		).toBe(false);
	});
	it('keeps preflight free of keys and acknowledgments', () => {
		const decision = decideBenchRun({ ...base, execute: false, key: '', freeAcknowledged: false });
		expect(decision.ok).toBe(true);
		if (decision.ok) expect(decision.acknowledgment).toBe('none');
	});
	it('requires a key only for execution', () => {
		expect(decideBenchRun({ ...base, key: '', freeAcknowledged: true }).ok).toBe(false);
		expect(decideBenchRun({ ...base, execute: false, key: '' }).ok).toBe(true);
	});
	it('bounds the run count to 1–3', () => {
		const acknowledged = { ...base, freeAcknowledged: true };
		expect(decideBenchRun({ ...acknowledged, runs: 0 }).ok).toBe(false);
		expect(decideBenchRun({ ...acknowledged, runs: 4 }).ok).toBe(false);
		expect(decideBenchRun({ ...acknowledged, runs: 3 }).ok).toBe(true);
	});
	it('marks new free endpoints as not comparable with the historical series', () => {
		const free = BENCH_MODELS['minimax-m3.1-flash-free'];
		expect(isComparableToSeries(free, 'historic-paid')).toBe(false);
		expect(isComparableToSeries(free, 'historic-free')).toBe(false);
		expect(isComparableToSeries(BENCH_MODELS['deepseek-v4.1-flash'], 'historic-paid')).toBe(true);
		expect(isComparableToSeries(BENCH_MODELS['cat-jam-free'], 'historic-free')).toBe(true);
	});
	it('allows an explicit endpoint override for the same model', () => {
		const decision = decideBenchRun({
			...base,
			freeAcknowledged: true,
			baseUrl: 'https://opencode.ai/inference/openai/v1/chat/completions'
		});
		expect(decision.ok).toBe(true);
		if (decision.ok) {
			expect(decision.endpoint).toBe('https://opencode.ai/inference/openai/v1/chat/completions');
		}
	});
});
