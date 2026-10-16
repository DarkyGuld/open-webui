/**
 * Intelligent UI capability benchmark v3 (post-M9.4 catalog), cheap model only.
 *
 * Evaluation-only. Uses a NEW ~60-prompt dataset (docs/.../routing-benchmark-v3/
 * prompts.json) covering the modern families (Chart/Timeline/Tabs/Form/Gallery/
 * Query/Mutation/Rich/Mixed). The v1/v2 50-prompt benchmark is untouched.
 *
 * Uses the LIVE production AUTO prompt INCLUDING the rich-widget instructions
 * (production injects them when rich widgets are enabled), the real adapter, and
 * the real validation/fallback path.
 *
 * Usage: OPENCODE_KEY=... npx tsx audit/lib/routing-benchmark-v3.mts
 * Model is fixed to cat-jam-free (do not substitute).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseIntelligentUI } from '../../src/lib/intelligent-ui/adapter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(REPO, 'docs/intelligent-ui/routing-benchmark-v3');
mkdirSync(OUT, { recursive: true });

const KEY = process.env.OPENCODE_KEY || '';
const MODEL = 'cat-jam-free';
const URL = 'https://opencode.ai/zen/go/v1/chat/completions';

const PY = path.join(REPO, '.venv', 'bin', 'python');
const pyEnv = { ...process.env, PYTHONPATH: path.join(REPO, 'backend') };
function pyString(module: string, name: string): string {
	return execSync(`${PY} -c "import sys; from ${module} import ${name} as v; sys.stdout.write(v)"`, {
		cwd: path.join(REPO, 'backend'),
		env: pyEnv
	}).toString();
}
const AUTO_HEADER = pyString('open_webui.intelligent_ui.filter', 'AUTO_HEADER');
const PROMPT = pyString('open_webui.intelligent_ui.catalog_prompt', 'PROMPT');
const RICH_HEADER = pyString('open_webui.intelligent_ui.filter', 'RICH_HEADER');
const RICH_PROMPT = pyString('open_webui.intelligent_ui.catalog_prompt', 'RICH_PROMPT');
const richAuto = `${RICH_HEADER} Use it only when it is clearly better than the native components.`;
const SYSTEM = `${AUTO_HEADER}\n\n${PROMPT}\n\n${richAuto}\n\n${RICH_PROMPT}`;

type Channel = 'markdown' | 'native' | 'rich' | 'invalid';
interface Case {
	id: string;
	category: string;
	prompt: string;
	expected_channel: 'markdown' | 'native' | 'rich';
	expected_family?: string;
	expect_mixed?: boolean;
}
const dataset = JSON.parse(readFileSync(path.join(OUT, 'prompts.json'), 'utf8')) as {
	cases: Case[];
};
const CASES = dataset.cases;

function collectTypes(node: any, acc: string[] = []): string[] {
	if (!node || typeof node !== 'object') return acc;
	if (typeof node.type === 'string') acc.push(node.type);
	if (Array.isArray(node.children)) for (const c of node.children) collectTypes(c, acc);
	return acc;
}
function families(types: string[]): string[] {
	const set = new Set<string>();
	for (const t of types) {
		if (t === 'metric') set.add('Metric');
		else if (t === 'comparison') set.add('Comparison');
		else if (t === 'table') set.add('Table');
		else if (t === 'chart') set.add('Chart');
		else if (t === 'timeline') set.add('Timeline');
		else if (t === 'gallery') set.add('Gallery');
		else if (t === 'data') set.add('Query');
		else if (
			['slider', 'select', 'switch', 'checkbox', 'input', 'textarea', 'radio', 'button', 'form', 'field'].includes(t)
		)
			set.add('Form');
		else if (t === 'tabs' || t === 'tab') set.add('Tabs');
		else if (['stack', 'row', 'grid', 'section', 'card'].includes(t)) set.add('Composed');
	}
	return [...set];
}

const JS_LEAK_RE = /\.toFixed\(|\.map\(|\.filter\(|\.reduce\(|Math\.|Date\.|eval\(|Function\(/g;

function classify(content: string): {
	channel: Channel;
	component?: string;
	components?: string[];
	tree?: unknown;
	reason?: string;
	jsLeaks: string[];
	prose: string;
} {
	const jsLeaks = [...content.matchAll(JS_LEAK_RE)].map((m) => m[0]);
	const fenceRe = /:::intelligent-ui(?:\{[^}]*\})?\s*\n([\s\S]*?)\n:::/;
	const prose = content.replace(fenceRe, '').replace(/:::intelligent-ui-html[\s\S]*?:::/, '').trim();
	if (content.includes(':::intelligent-ui-html')) return { channel: 'rich', jsLeaks, prose };
	const m = fenceRe.exec(content);
	if (!m) return { channel: 'markdown', jsLeaks, prose };
	const out = parseIntelligentUI({ version: '1', content: m[1].trim() });
	if (out.ok) {
		const components = collectTypes(out.node);
		return { channel: 'native', component: out.node.type, components, tree: out.node, jsLeaks, prose };
	}
	return { channel: 'invalid', reason: out.reason, jsLeaks, prose };
}

async function call(prompt: string) {
	const t0 = Date.now();
	const res = await fetch(URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${KEY}`,
			'content-type': 'application/json',
			'x-opencode-session': `bench3-${Math.random().toString(36).slice(2)}`
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
	if (!res.ok) return { error: data?.error?.message || res.status, latency };
	return {
		content: data?.choices?.[0]?.message?.content ?? '',
		usage: data?.usage ?? {},
		latency
	};
}

function scoreCase(c: Case, r: any) {
	if (r.error) {
		return { channelOk: false, familyOk: false, mixedOk: false, errorCategory: 'generation-failure', cls: { channel: 'error' } as any };
	}
	const cls = classify(r.content);
	const chOk =
		(c.expected_channel === 'markdown' && cls.channel === 'markdown') ||
		(c.expected_channel === 'native' && cls.channel === 'native') ||
		(c.expected_channel === 'rich' && cls.channel === 'rich');
	const fams = cls.channel === 'native' ? families(cls.components ?? []) : [];
	const familyOk =
		c.expected_channel === 'native'
			? !!c.expected_family && fams.includes(c.expected_family)
			: chOk;
	const mixedOk = c.expect_mixed ? cls.channel === 'native' && cls.prose.length > 40 : true;

	let errorCategory: string | null = null;
	if (!chOk) {
		if (cls.channel === 'invalid') errorCategory = 'invalid';
		else if (c.expected_channel === 'native' && cls.channel === 'markdown') errorCategory = 'under-use';
		else if (c.expected_channel === 'native' && cls.channel === 'rich') errorCategory = 'rich-over-use';
		else if (c.expected_channel === 'markdown' && cls.channel === 'native') errorCategory = 'over-use';
		else if (c.expected_channel === 'markdown' && cls.channel === 'rich') errorCategory = 'rich-over-use';
		else if (c.expected_channel === 'rich' && cls.channel === 'native') errorCategory = 'rich-under-use';
		else if (c.expected_channel === 'rich' && cls.channel === 'markdown') errorCategory = 'rich-under-use';
		else errorCategory = 'other';
	} else if (c.expected_channel === 'native' && !familyOk) {
		errorCategory = 'wrong-family';
	} else if (c.expect_mixed && !mixedOk) {
		errorCategory = 'not-mixed';
	}

	return {
		channelOk: chOk,
		familyOk,
		mixedOk,
		errorCategory,
		cls,
		families: fams
	};
}

async function runOnce(run: number) {
	const results: any[] = [];
	let channelOk = 0, familyOk = 0, invalid = 0, errors = 0;
	let totalTokens = 0, totalPrompt = 0, totalCompletion = 0;
	const tax: Record<string, number> = {
		'under-use': 0, 'over-use': 0, 'wrong-family': 0, invalid: 0,
		'rich-over-use': 0, 'rich-under-use': 0, 'not-mixed': 0, 'generation-failure': 0, other: 0
	};
	const jsLeakCases: string[] = [];

	for (const c of CASES) {
		const r = await call(c.prompt);
		if (r.error) errors++;
		const s = scoreCase(c, r);
		if (s.channelOk) channelOk++;
		if (s.familyOk) familyOk++;
		if (s.cls.channel === 'invalid') invalid++;
		if (s.errorCategory) tax[s.errorCategory] = (tax[s.errorCategory] ?? 0) + 1;
		if (s.cls.jsLeaks && s.cls.jsLeaks.length) jsLeakCases.push(`${c.id}:${[...new Set(s.cls.jsLeaks)].join('|')}`);
		totalTokens += r.usage?.total_tokens ?? 0;
		totalPrompt += r.usage?.prompt_tokens ?? 0;
		totalCompletion += r.usage?.completion_tokens ?? 0;
		results.push({
			id: c.id,
			category: c.category,
			prompt: c.prompt,
			expectedChannel: c.expected_channel,
			expectedFamily: c.expected_family,
			actualChannel: s.cls.channel,
			primaryComponent: s.cls.component,
			componentTree: s.cls.components,
			families: s.families,
			valid: s.cls.channel === 'native',
			fallback: s.cls.channel === 'invalid',
			channelOk: s.channelOk,
			familyOk: s.familyOk,
			mixedOk: s.mixedOk,
			expectMixed: !!c.expect_mixed,
			jsLeaks: s.cls.jsLeaks ?? [],
			latencyMs: r.latency,
			promptTokens: r.usage?.prompt_tokens ?? 0,
			completionTokens: r.usage?.completion_tokens ?? 0,
			totalTokens: r.usage?.total_tokens ?? 0,
			model: MODEL,
			reason: s.cls.reason ?? (s.cls.component ? `root=${s.cls.component}` : 'no ui fence'),
			errorCategory: s.errorCategory,
			raw: (r.content ?? '').slice(0, 4000)
		});
		process.stdout.write(
			`${s.channelOk ? (s.familyOk ? '✓' : '~') : '✗'} ${s.cls.channel}${s.cls.component ? ':' + s.cls.component : ''}  [${c.category}] ${c.prompt.slice(0, 40)}\n`
		);
	}

	const n = CASES.length;
	const lat = results.map((r) => r.latencyMs || 0).sort((a, b) => a - b);
	const pct = (p: number) => lat[Math.min(lat.length - 1, Math.floor((p / 100) * lat.length))] ?? 0;
	const byCat: Record<string, { total: number; channelOk: number; familyOk: number }> = {};
	for (const r of results) {
		const b = (byCat[r.category] ??= { total: 0, channelOk: 0, familyOk: 0 });
		b.total++;
		if (r.channelOk) b.channelOk++;
		if (r.familyOk) b.familyOk++;
	}
	const categories: Record<string, any> = {};
	for (const [k, v] of Object.entries(byCat)) {
		categories[k] = {
			total: v.total,
			channelAccuracy: +(100 * v.channelOk / v.total).toFixed(1),
			familyAccuracy: +(100 * v.familyOk / v.total).toFixed(1)
		};
	}
	const summary = {
		run,
		model: MODEL,
		total: n,
		errors,
		channelAccuracy: +(100 * channelOk / n).toFixed(1),
		familyAccuracy: +(100 * familyOk / n).toFixed(1),
		invalidRate: +(100 * invalid / n).toFixed(1),
		fallbackRate: +(100 * invalid / n).toFixed(1),
		jsLeakCases,
		errorTaxonomy: tax,
		categories,
		avgLatencyMs: Math.round(lat.reduce((a, b) => a + b, 0) / n),
		medianLatencyMs: pct(50),
		p95LatencyMs: pct(95),
		totalTokens,
		avgTokens: Math.round(totalTokens / n),
		avgPromptTokens: Math.round(totalPrompt / n),
		avgCompletionTokens: Math.round(totalCompletion / n),
		systemPromptChars: SYSTEM.length
	};
	writeFileSync(path.join(OUT, `results-run${run}.json`), JSON.stringify({ summary, results }, null, 2));
	return summary;
}

const runs: any[] = [];
for (let i = 1; i <= 3; i++) {
	console.log(`\n===== RUN ${i} =====`);
	runs.push(await runOnce(i));
}

const mean = (k: string) => +(runs.reduce((a, r) => a + r[k], 0) / runs.length).toFixed(1);
const range = (k: string) => [Math.min(...runs.map((r) => r[k])), Math.max(...runs.map((r) => r[k]))];
const run1 = JSON.parse(readFileSync(path.join(OUT, 'results-run1.json'), 'utf8'));
const means = {
	channelAccuracy: mean('channelAccuracy'),
	familyAccuracy: mean('familyAccuracy'),
	invalidRate: mean('invalidRate'),
	fallbackRate: mean('fallbackRate'),
	avgLatencyMs: mean('avgLatencyMs'),
	medianLatencyMs: mean('medianLatencyMs'),
	p95LatencyMs: mean('p95LatencyMs'),
	avgPromptTokens: mean('avgPromptTokens'),
	avgCompletionTokens: mean('avgCompletionTokens'),
	avgTokens: mean('avgTokens')
};
const combined = {
	summary: run1.summary,
	means,
	ranges: {
		channelAccuracy: range('channelAccuracy'),
		familyAccuracy: range('familyAccuracy')
	},
	runs: runs.map((r) => r.summary),
	results: run1.results
};
writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(combined, null, 2));
console.log('\n=== V3 SUMMARY (means of 3 runs) ===');
console.log(JSON.stringify(means, null, 2));
console.log('ranges:', JSON.stringify(combined.ranges));
