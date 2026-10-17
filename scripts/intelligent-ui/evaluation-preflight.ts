/** Read-only preflight. No network requests, no secrets, no model calls.
 * Run before approved execution to compare the frozen holdout and production
 * artifact hashes. Prices are documented separately; never infer billing here.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const files = [
	'docs/intelligent-ui/m9-12-evaluation/holdout.json',
	'docs/intelligent-ui/routing-benchmark-v6/prompts.json',
	'src/lib/intelligent-ui/evaluation.ts',
	'src/lib/intelligent-ui/adapter.ts',
	'src/lib/intelligent-ui/schema.ts',
	'src/lib/intelligent-ui/catalog.ts',
	'backend/open_webui/intelligent_ui/catalog_prompt.py',
	'backend/open_webui/intelligent_ui/filter.py',
	'package-lock.json'
];
const hashes = Object.fromEntries(files.map((path) => {
	const content = readFileSync(path);
	return [path, { sha256: createHash('sha256').update(content).digest('hex'), bytes: content.length }];
}));
const dataset = JSON.parse(readFileSync(files[0], 'utf8'));
const counts: Record<string, number> = {};
for (const c of dataset.cases) counts[c.language] = (counts[c.language] ?? 0) + 1;
const input = 4000;
const output = 2000;
const calls = 3 * (44 + dataset.cases.length);
console.log(JSON.stringify({
	mode: 'PREPARATION_ONLY_NO_API_CALLS', contractVersion: dataset.contractVersion,
	holdoutCases: dataset.cases.length, languages: counts,
	deepseekCallsPlanned: calls,
	estimate: { inputTokens: calls * input, outputTokens: calls * output,
		totalTokens: calls * (input + output), serialMinutesAt11SecondsPerCall: calls * 11 / 60,
		usdOffPeakNoCache: (calls * input * 0.15 + calls * output * 0.60) / 1e6,
		usdPeakNoCache: (calls * input * 0.30 + calls * output * 1.20) / 1e6 },
	approval: 'REQUIRED before any paid calls; estimate is not a billing guarantee',
	hashes
}, null, 2));
