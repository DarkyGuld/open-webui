/**
 * Intelligent UI routing benchmark v6 — the versioned EVALUATION CONTRACT
 * (src/lib/intelligent-ui/evaluation.ts): separates presentation intent from
 * data availability, credits correct requests for missing data, and detects
 * fabrication (ignored provided numbers / invented image sources).
 *
 * Uses the production AUTO prompt (incl. rich instructions), the real adapter
 * and the real validation/fallback path. Historical v1–v5 results untouched.
 *
 * Default: preflight only (no model requests). BENCH_DATASET selects frozen
 * cases independently of a fresh BENCH_OUTDIR. BENCH_EXECUTE=1 explicitly
 * enables requests; paid models additionally need user approval before setting
 * BENCH_PAID_APPROVED=1, and free (limited-time) endpoints need
 * BENCH_FREE_ACKNOWLEDGED=1 because their results are not comparable with the
 * paid historical series. Historical output files are never overwritten.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseIntelligentUI } from '../../src/lib/intelligent-ui/adapter';
import {
	evaluateV6,
	EVAL_CONTRACT_VERSION,
	validateRichWidget,
	type EvaluationCase,
	type ResponseClassification
} from '../../src/lib/intelligent-ui/evaluation';
import { decideBenchRun } from '../../scripts/intelligent-ui/bench-models';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..');
const OUT = process.env.BENCH_OUTDIR
	? path.resolve(REPO, process.env.BENCH_OUTDIR)
	: path.resolve(REPO, 'docs/intelligent-ui/routing-benchmark-v6');

const KEY = process.env.OPENCODE_KEY || '';
const MODEL = process.env.BENCH_MODEL || 'cat-jam-free';
const RUNS = Number(process.env.BENCH_RUNS || 1);
const EXECUTE = process.env.BENCH_EXECUTE === '1';
const decision = decideBenchRun({
	model: MODEL,
	runs: RUNS,
	execute: EXECUTE,
	paidApproved: process.env.BENCH_PAID_APPROVED === '1',
	freeAcknowledged: process.env.BENCH_FREE_ACKNOWLEDGED === '1',
	key: KEY,
	baseUrl: process.env.BENCH_BASE_URL
});
if (!decision.ok) throw new Error(decision.error);
const { model: MODEL_SPEC, endpoint: URL } = decision;
if (EXECUTE && existsSync(path.join(OUT, 'results-run1.json')))
	throw new Error('Refusing to overwrite existing results; choose a fresh BENCH_OUTDIR');
if (EXECUTE) mkdirSync(OUT, { recursive: true });

const PY = path.join(REPO, '.venv', 'bin', 'python');
const pyEnv = { ...process.env, PYTHONPATH: path.join(REPO, 'backend') };
function pyString(module: string, name: string): string {
	return execSync(`${PY} -c "import sys; from ${module} import ${name} as v; sys.stdout.write(v)"`, {
		cwd: path.join(REPO, 'backend'),
		env: pyEnv
	}).toString();
}
// Preflight must never crash: without the local Python environment the production
// prompt cannot be read, which is a missing prerequisite to report, not a crash.
let SYSTEM = '';
let promptSource = 'production-auto-and-rich';
try {
	const AUTO_HEADER = pyString('open_webui.intelligent_ui.filter', 'AUTO_HEADER');
	const PROMPT = pyString('open_webui.intelligent_ui.catalog_prompt', 'PROMPT');
	const RICH_HEADER = pyString('open_webui.intelligent_ui.filter', 'RICH_HEADER');
	const RICH_PROMPT = pyString('open_webui.intelligent_ui.catalog_prompt', 'RICH_PROMPT');
	const richAuto = `${RICH_HEADER} Use it only when it is clearly better than the native components.`;
	SYSTEM = `${AUTO_HEADER}\n\n${PROMPT}\n\n${richAuto}\n\n${RICH_PROMPT}`;
} catch (error) {
	promptSource = 'unavailable';
	if (EXECUTE)
		throw new Error(
			`Production prompt unavailable (${(error as Error).message.split('\n')[0]}); refusing to execute`
		);
}

const CASES: EvaluationCase[] = JSON.parse(
	readFileSync(process.env.BENCH_DATASET ? path.resolve(REPO, process.env.BENCH_DATASET) :
		path.join(REPO, 'docs/intelligent-ui/routing-benchmark-v6/prompts.json'), 'utf8')
).cases;

const JS_LEAK_RE = /\.toFixed\(|\.map\(|\.filter\(|\.reduce\(|Math\.|Date\.|eval\(|Function\(/g;

function collect(node: any, fn: (n: any) => void): void {
	if (!node || typeof node !== 'object') return;
	fn(node);
	for (const c of Array.isArray(node.children) ? node.children : []) collect(c, fn);
}

function classify(content: string): ResponseClassification {
	const jsLeaks = [...content.matchAll(JS_LEAK_RE)].map((m) => m[0]);
	const richRe = /:::intelligent-ui-html(?:\{[^}]*\})?\s*\n?([\s\S]*?)\n?:::/;
	const fenceRe = /:::intelligent-ui(?:\{[^}]*\})?\s*\n([\s\S]*?)\n:::/;
	const fenceM = fenceRe.exec(content);
	const fenceContent = fenceM ? fenceM[1] : '';
	const richM = richRe.exec(content);
	const richHtml = richM ? richM[1] : '';
	const prose = content.replace(fenceRe, '').replace(richRe, '').trim();
	const srcs: string[] = [];
	const querySources: string[] = [];
	if (content.includes(':::intelligent-ui-html'))
		return { channel: 'rich', families: [], srcs, querySources, fenceContent, richHtml, prose, jsLeaks };
	if (!fenceM) return { channel: 'markdown', families: [], srcs, querySources, fenceContent, richHtml, prose, jsLeaks };
	const out = parseIntelligentUI({ version: '1', content: fenceM[1].trim() });
	if (!out.ok) return { channel: 'invalid', families: [], srcs, querySources, fenceContent, richHtml, prose, jsLeaks };
	const families: string[] = [];
	collect(out.node, (n) => {
		const t = n.type as string;
		if (t === 'metric') families.push('Metric');
		else if (t === 'comparison') families.push('Comparison');
		else if (t === 'table') families.push('Table');
		else if (t === 'chart') families.push('Chart');
		else if (t === 'timeline') families.push('Timeline');
		else if (t === 'gallery') families.push('Gallery');
		else if (t === 'data') families.push('Query');
		else if (['slider', 'select', 'switch', 'checkbox', 'input', 'textarea', 'radio', 'button', 'form', 'field'].includes(t)) families.push('Form');
		else if (t === 'tabs' || t === 'tab') families.push('Tabs');
		else if (['stack', 'row', 'grid', 'section', 'card'].includes(t)) families.push('Composed');
		if (t === 'gallery' && Array.isArray(n.items))
			srcs.push(...n.items.map((i: any) => String(i?.src ?? '')).filter(Boolean));
		if (t === 'data' && typeof n.source === 'string' && n.source) querySources.push(n.source);
	});
	return { channel: 'native', families, srcs, querySources, fenceContent, richHtml, prose, jsLeaks };
}

async function call(prompt: string, sessionKey: string) {
	const t0 = Date.now();
	const res = await fetch(URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${KEY}`,
			'content-type': 'application/json',
			'user-agent': 'openwebui-intelligent-ui-eval/1.0',
			'x-opencode-session': `bench6-${sessionKey}`
		},
		body: JSON.stringify({
			model: MODEL,
			stream: false,
			messages: [
				{ role: 'system', content: SYSTEM },
				{ role: 'user', content: prompt }
			]
		})
	});
	const latency = Date.now() - t0;
	const data = await res.json();
	// The provider may answer with a different model id than requested (stealth
	// aliases). Record what actually answered, never only what was requested.
	const responseModel = typeof data?.model === 'string' ? data.model : null;
	if (!res.ok) return { error: data?.error?.message || res.status, latency, content: '', usage: {}, responseModel };
	return { error: null as string | null, latency, content: data?.choices?.[0]?.message?.content ?? '', usage: data?.usage ?? {}, responseModel };
}

async function runOnce(run: number) {
	const results: any[] = [];
	const dims = {
		overallOk: 0, channelOk: 0, familyOk: 0, mixedOk: 0, asked: 0, fabricated: 0,
		factUnverified: 0, authorizedRetrieval: 0,
		fabricatedUi: 0, invalidRich: 0, invalid: 0, errors: 0,
		underUse: 0, overUse: 0, noAsk: 0, wrongFamily: 0, richOver: 0, richUnder: 0, notMixed: 0
	};
	let totalTokens = 0;
	const responseModels = new Set<string>();
	for (const c of CASES) {
		const r = await call(c.prompt, `${MODEL}-r${run}-${c.id}`);
		if (r.responseModel) responseModels.add(r.responseModel);
		if (r.error) {
			dims.errors++;
			results.push({ id: c.id, error: r.error, latencyMs: r.latency, model: MODEL, responseModel: r.responseModel });
			process.stdout.write(`! error ${c.id}\n`);
			continue;
		}
		const cls = classify(r.content);
		const richCheck = cls.channel === 'rich' ? validateRichWidget(cls.richHtml) : { valid: true, reason: '' };
		const v = evaluateV6(c, cls);
		if (v.overallOk) dims.overallOk++;
		if (v.channelOk) dims.channelOk++;
		if (v.familyOk) dims.familyOk++;
		if (v.mixedOk) dims.mixedOk++;
		if (v.askedForMissingData) dims.asked++;
		if (v.fabricatedFacts) dims.fabricated++;
		if (v.factCheck === 'unverified') dims.factUnverified++;
		if (v.authorizedRetrieval) dims.authorizedRetrieval++;
		if (v.errorCategory === 'fabricated-ui') dims.fabricatedUi++;
		if (v.richInvalid) dims.invalidRich++;
		if (cls.channel === 'invalid') dims.invalid++;
		switch (v.errorCategory) {
			case 'under-use': dims.underUse++; break;
			case 'over-use': dims.overUse++; break;
			case 'no-ask': dims.noAsk++; break;
			case 'wrong-family': dims.wrongFamily++; break;
			case 'rich-over-use': dims.richOver++; break;
			case 'rich-under-use': dims.richUnder++; break;
			case 'not-mixed': dims.notMixed++; break;
		}
		totalTokens += r.usage?.total_tokens ?? 0;
		results.push({
			id: c.id, prompt: c.prompt, language: c.language, intent: c.intent,
			dataAvailable: c.dataAvailable, expectedChannel: c.expectedChannel,
			expectedFamily: c.expectedFamily, missingDataOk: !!c.missingDataOk,
			actualChannel: cls.channel, families: cls.families, srcs: cls.srcs, querySources: cls.querySources,
			richValid: cls.channel === 'rich' ? richCheck.valid : null,
			richReason: cls.channel === 'rich' ? richCheck.reason : null,
			channelOk: v.channelOk, familyOk: v.familyOk, mixedOk: v.mixedOk,
			overallOk: v.overallOk, authorizedRetrieval: v.authorizedRetrieval, factCheck: v.factCheck,
			askedForMissingData: v.askedForMissingData, fabricatedFacts: v.fabricatedFacts,
			errorCategory: v.errorCategory, jsLeaks: cls.jsLeaks,
			latencyMs: r.latency, totalTokens: r.usage?.total_tokens ?? 0,
			model: MODEL, responseModel: r.responseModel, raw: r.content.slice(0, 4000)
		});
		process.stdout.write(
			`${v.overallOk ? '✓' : '✗'} ${cls.channel} [${c.intent}/${c.dataAvailable}] ${c.id}\n`
		);
	}
	const n = CASES.length;
	const lat = results.map((r) => r.latencyMs || 0).sort((a, b) => a - b);
	const summary = {
		run, contractVersion: EVAL_CONTRACT_VERSION, model: MODEL, total: n, errors: dims.errors,
		requestedModel: MODEL,
		responseModels: [...responseModels].sort(),
		modelTier: MODEL_SPEC.tier,
		modelSeries: MODEL_SPEC.series,
		comparableToHistoricalSeries: MODEL_SPEC.series !== 'new-free',
		modelNote: MODEL_SPEC.note,
		endpoint: URL,
		overallSuccessRate: +(100 * dims.overallOk / n).toFixed(1),
		channelAccuracy: +(100 * dims.channelOk / n).toFixed(1),
		familyAccuracy: +(100 * dims.familyOk / n).toFixed(1),
		invalidRate: +(100 * dims.invalid / n).toFixed(1),
		invalidRichRate: +(100 * dims.invalidRich / n).toFixed(1),
		askedForMissingData: dims.asked,
		fabricationRate: +(100 * dims.fabricated / n).toFixed(1),
		factUnverifiedRate: +(100 * dims.factUnverified / n).toFixed(1),
		authorizedRetrievals: dims.authorizedRetrieval,
		dimensions: dims,
		avgLatencyMs: Math.round(lat.reduce((a, b) => a + b, 0) / n),
		medianLatencyMs: lat[Math.floor(lat.length / 2)] ?? 0,
		totalTokens, avgTokens: Math.round(totalTokens / n)
	};
	writeFileSync(path.join(OUT, `results-run${run}.json`), JSON.stringify({ summary, results }, null, 2));
	return summary;
}

const runs: any[] = [];
if (!EXECUTE) console.log(JSON.stringify({ mode: 'PREFLIGHT_NO_API_CALLS', model: MODEL,
	modelTier: MODEL_SPEC.tier, modelSeries: MODEL_SPEC.series,
	comparableToHistoricalSeries: MODEL_SPEC.series !== 'new-free', modelNote: MODEL_SPEC.note, endpoint: URL,
	promptSource, systemChars: promptSource === 'unavailable' ? null : SYSTEM.length,
	warning: promptSource === 'unavailable'
		? 'Local Python environment missing: the production prompt was not read. This is a preflight only; execution needs .venv.'
		: null,
	cases: CASES.length, runs: RUNS, callsPlanned: CASES.length * RUNS,
	contractVersion: EVAL_CONTRACT_VERSION, outdir: OUT }, null, 2));
if (EXECUTE) {
	for (let i = 1; i <= RUNS; i++) {
		console.log(`\n===== v6 RUN ${i}/${RUNS} (${MODEL}) =====`);
		runs.push(await runOnce(i));
	}
	const run1 = JSON.parse(readFileSync(path.join(OUT, 'results-run1.json'), 'utf8'));
	writeFileSync(
		path.join(OUT, 'results.json'),
		JSON.stringify({ summary: run1.summary, runs: runs.map((r) => r.summary), results: run1.results }, null, 2)
	);
	console.log('\n=== v6 SUMMARY ===');
	console.log(JSON.stringify(runs[runs.length - 1], null, 2));
}
