import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const file = (relative: string) => readFileSync(new URL(`../../../../${relative}`, import.meta.url), 'utf8');
const path = 'docs/intelligent-ui/m9-12-evaluation/holdout.json';
const raw = file(path);
const dataset = JSON.parse(raw);

describe('M9.12 frozen evaluation design (offline)', () => {
	it('covers 50 independent cases in both languages, with frozen expected labels', () => {
		expect(dataset.cases).toHaveLength(50);
		expect(new Set(dataset.cases.map((c: any) => c.id)).size).toBe(50);
		expect(dataset.cases.some((c: any) => c.language === 'no')).toBe(true);
		expect(dataset.cases.some((c: any) => c.language === 'en')).toBe(true);
		for (const c of dataset.cases) {
			expect(['markdown', 'native', 'rich']).toContain(c.expectedChannel);
			if (c.expectedChannel === 'native') expect(c.expectedFamily).toBeTruthy();
			if (c.dataAvailable === 'unavailable') expect(c.missingDataOk).toBe(true);
			if (c.intent === 'images' && c.dataAvailable === 'provided') expect(c.providedImageRefs?.length).toBeGreaterThan(0);
		}
	});
	it('does not duplicate any old evaluation or tuning prompt exactly', () => {
		const old = [
			'docs/intelligent-ui/routing-benchmark-v3/prompts.json',
			'docs/intelligent-ui/routing-benchmark-v4/holdout.json',
			'docs/intelligent-ui/routing-benchmark-v5/tuning.json',
			'docs/intelligent-ui/routing-benchmark-v5/new-holdout.json',
			'docs/intelligent-ui/routing-benchmark-v6/prompts.json'
		].flatMap((p) => JSON.parse(file(p)).cases.map((c: any) => c.prompt.trim().toLowerCase()));
		for (const c of dataset.cases) expect(old).not.toContain(c.prompt.trim().toLowerCase());
	});
	it('matches the registered holdout checksum (no silent relabeling after freeze)', () => {
		const freeze = JSON.parse(file('docs/intelligent-ui/m9-12-evaluation/freeze.json'));
		expect(createHash('sha256').update(raw).digest('hex')).toBe(freeze.holdoutSha256);
	});
	it('blocks paid execution before any API request without explicit approval', () => {
		const root = fileURLToPath(new URL('../../../../', import.meta.url));
		const result = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'audit/lib/routing-benchmark-v6.mts'], {
			cwd: root, encoding: 'utf8', timeout: 15000,
			env: { ...process.env, BENCH_EXECUTE: '1', BENCH_MODEL: 'deepseek-v4.1-flash', BENCH_PAID_APPROVED: '', OPENCODE_KEY: '' }
		});
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain('Paid calls require explicit user approval');
	});
	it('refuses to overwrite historical results before sending a request', () => {
		const root = fileURLToPath(new URL('../../../../', import.meta.url));
		const result = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'audit/lib/routing-benchmark-v6.mts'], {
			cwd: root, encoding: 'utf8', timeout: 15000,
			env: { ...process.env, BENCH_EXECUTE: '1', BENCH_MODEL: 'cat-jam-free',
				BENCH_OUTDIR: 'docs/intelligent-ui/routing-benchmark-v6', OPENCODE_KEY: 'synthetic-test-key' }
		});
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain('Refusing to overwrite existing results');
	});
});
