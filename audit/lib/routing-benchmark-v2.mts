/**
 * Intelligent UI routing benchmark v2 (one-pass, cheap model only).
 *
 * Evaluation-only. Reuses the EXACT same 50 prompts, expected channel labels and
 * scoring rules as v1 (`audit/lib/routing-benchmark.mts`), but:
 *   - uses the LIVE production Filter AUTO prompt (AUTO_HEADER + PROMPT) read from
 *     the Python source, so M9.5 prompt changes are what is measured;
 *   - writes to docs/intelligent-ui/routing-benchmark-v2/results.json (v1 output
 *     is left untouched);
 *   - records prompt/completion tokens, latency percentiles and an error taxonomy.
 *
 * Usage:
 *   OPENCODE_KEY=... npx tsx audit/lib/routing-benchmark-v2.mts
 * Model is fixed to cat-jam-free (do not substitute).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseIntelligentUI } from '../../src/lib/intelligent-ui/adapter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(REPO, 'docs/intelligent-ui/routing-benchmark-v2');
mkdirSync(OUT, { recursive: true });

const KEY = process.env.OPENCODE_KEY || '';
const MODEL = 'cat-jam-free';
const URL = 'https://opencode.ai/zen/go/v1/chat/completions';

// --- Exact production AUTO system prompt (frozen before the run) ---
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
const SYSTEM = `${AUTO_HEADER}\n\n${PROMPT}`;

type Channel = 'markdown' | 'native' | 'rich' | 'invalid';
interface Case {
	prompt: string;
	channel: 'markdown' | 'native';
	components?: string[];
}

// --- EXACT same 50 prompts as v1 (verbatim) ---
const CASES: Case[] = [
	{ prompt: 'Explain what DNS is in two sentences.', channel: 'markdown' },
	{ prompt: 'Who was Nikola Tesla?', channel: 'markdown' },
	{ prompt: 'What is photosynthesis?', channel: 'markdown' },
	{ prompt: 'Write a short poem about the sea.', channel: 'markdown' },
	{ prompt: 'Summarize the causes of World War I.', channel: 'markdown' },
	{ prompt: 'How do I stay motivated when learning to code?', channel: 'markdown' },
	{ prompt: 'Explain the difference between TCP and UDP.', channel: 'markdown' },
	{ prompt: 'Give me tips to sleep better.', channel: 'markdown' },
	{ prompt: 'What is a REST API?', channel: 'markdown' },
	{ prompt: 'Explain recursion with a simple example.', channel: 'markdown' },
	{ prompt: 'What should I cook for dinner tonight?', channel: 'markdown' },
	{ prompt: 'Tell me a fun fact about the Roman Empire.', channel: 'markdown' },
	{ prompt: 'How does a car engine work?', channel: 'markdown' },
	{ prompt: 'Explain the water cycle.', channel: 'markdown' },
	{ prompt: 'What are the health benefits of walking?', channel: 'markdown' },
	{ prompt: 'Compare these three VPS plans: Basic, Pro, Team.', channel: 'native', components: ['comparison'] },
	{ prompt: 'Compare Python vs JavaScript for backend development.', channel: 'native', components: ['comparison'] },
	{ prompt: 'Compare iPhone and Android for a developer.', channel: 'native', components: ['comparison'] },
	{ prompt: 'Show a comparison of the three cloud providers.', channel: 'native', components: ['comparison'] },
	{ prompt: 'Which is better, PostgreSQL or MySQL? Compare them.', channel: 'native', components: ['comparison'] },
	{ prompt: 'What is the monthly cost of a 250000 kr loan at 0.4% interest over 60 months?', channel: 'native', components: ['metric'] },
	{ prompt: 'How many employees do we have in total? Just the number.', channel: 'native', components: ['metric'] },
	{ prompt: 'Give me the headline total revenue figure.', channel: 'native', components: ['metric'] },
	{ prompt: 'What is 15% of 2400?', channel: 'native', components: ['metric'] },
	{ prompt: 'Show the monthly cost as a single number.', channel: 'native', components: ['metric'] },
	{ prompt: 'Show a table of monthly costs: compute, storage, backup.', channel: 'native', components: ['table'] },
	{ prompt: 'List the top 5 programming languages with their market share.', channel: 'native', components: ['table'] },
	{ prompt: 'Show this data as a table: 3 products with price and stock.', channel: 'native', components: ['table'] },
	{ prompt: 'Give me a table of the planets and their distances from the sun.', channel: 'native', components: ['table'] },
	{ prompt: 'Tabulate the quarterly sales numbers.', channel: 'native', components: ['table'] },
	{ prompt: 'Build a small loan calculator where I can drag a slider for months.', channel: 'native', components: ['slider', 'metric'] },
	{ prompt: 'Make a pricing calculator with a seats slider.', channel: 'native', components: ['slider', 'metric'] },
	{ prompt: 'Create an interactive form to sign up with name and email.', channel: 'native', components: ['input'] },
	{ prompt: 'Give me a dashboard with the key numbers and a cost breakdown.', channel: 'native', components: ['metric', 'table', 'stack', 'grid', 'card', 'section'] },
	{ prompt: 'Show an overview of the workspace with cost and seats.', channel: 'native', components: ['metric', 'stack', 'grid', 'card'] },
	{ prompt: 'Lay out a summary with several metric cards side by side.', channel: 'native', components: ['metric', 'grid', 'card', 'row'] },
	{ prompt: 'Show the seats as a slider and compute the price.', channel: 'native', components: ['slider', 'metric'] },
	{ prompt: 'Present a small project status with a badge and metrics.', channel: 'native', components: ['badge', 'metric'] },
	{ prompt: 'Show the plan tiers as cards with their prices.', channel: 'native', components: ['card', 'metric', 'grid', 'comparison'] },
	{ prompt: 'Make a settings form with a toggle and a slider.', channel: 'native', components: ['switch', 'slider', 'checkbox', 'input'] },
	{ prompt: 'What is the current stock price of Apple? Just the number.', channel: 'native', components: ['metric'] },
	{ prompt: 'Summarize these three options for me to choose from.', channel: 'native', components: ['comparison'] },
	{ prompt: 'Show a data table of user signups per month.', channel: 'native', components: ['table'] },
	{ prompt: 'Give me a compact metric for the uptime percentage.', channel: 'native', components: ['metric'] },
	{ prompt: 'Explain how HTTPS works.', channel: 'markdown' },
	{ prompt: 'What is the capital of Australia?', channel: 'markdown' },
	{ prompt: 'Describe the plot of Hamlet briefly.', channel: 'markdown' },
	{ prompt: 'How do I change a car tyre?', channel: 'markdown' },
	{ prompt: 'What are good habits for remote work?', channel: 'markdown' },
	{ prompt: 'Explain the difference between a list and a tuple in Python.', channel: 'markdown' }
];

function collectTypes(node: any, acc: string[] = []): string[] {
	if (!node || typeof node !== 'object') return acc;
	if (typeof node.type === 'string') acc.push(node.type);
	if (Array.isArray(node.children)) for (const c of node.children) collectTypes(c, acc);
	return acc;
}

function classify(content: string): {
	channel: Channel;
	component?: string;
	components?: string[];
	tree?: unknown;
	reason?: string;
} {
	if (content.includes(':::intelligent-ui-html')) return { channel: 'rich' };
	const m = /:::intelligent-ui(?:\{[^}]*\})?\s*\n([\s\S]*?)\n:::/.exec(content);
	if (!m) return { channel: 'markdown' };
	const out = parseIntelligentUI({ version: '1', content: m[1].trim() });
	if (out.ok) {
		const components = collectTypes(out.node);
		return { channel: 'native', component: out.node.type, components, tree: out.node };
	}
	return { channel: 'invalid', reason: out.reason };
}

async function call(prompt: string) {
	const t0 = Date.now();
	const res = await fetch(URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${KEY}`,
			'content-type': 'application/json',
			'x-opencode-session': `bench2-${Math.random().toString(36).slice(2)}`
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
	const content = data?.choices?.[0]?.message?.content ?? '';
	const usage = data?.usage ?? {};
	return { content, usage, latency };
}

const results: any[] = [];
let channelOk = 0;
let componentOk = 0;
let invalid = 0;
let errors = 0;
let totalTokens = 0;
let totalPromptTokens = 0;
let totalCompletionTokens = 0;
const tax: Record<string, number> = {
	'under-use': 0,
	'over-use': 0,
	'wrong-component': 0,
	invalid: 0,
	fallback: 0,
	'rich-unnecessary': 0,
	'generation-failure': 0,
	other: 0
};

for (const c of CASES) {
	const r = await call(c.prompt);
	if (r.error) {
		errors++;
		tax['generation-failure']++;
		results.push({
			prompt: c.prompt,
			expectedChannel: c.channel,
			expectedComponents: c.components,
			actualChannel: 'error',
			error: r.error,
			latencyMs: r.latency,
			model: MODEL
		});
		process.stdout.write(`! error  ${c.prompt.slice(0, 46)}\n`);
		continue;
	}
	const cls = classify(r.content);
	const chOk =
		cls.channel === c.channel ||
		(c.channel === 'native' && (cls.channel === 'native' || cls.channel === 'rich'));
	const compOk =
		c.channel === 'native'
			? (c.components ?? []).some((x) => (cls.components ?? []).includes(x))
			: chOk;
	if (chOk) channelOk++;
	if (compOk) componentOk++;
	if (cls.channel === 'invalid') invalid++;
	totalTokens += r.usage?.total_tokens ?? 0;
	totalPromptTokens += r.usage?.prompt_tokens ?? 0;
	totalCompletionTokens += r.usage?.completion_tokens ?? 0;

	let errorCategory: string | null = null;
	if (!chOk) {
		if (c.channel === 'native' && cls.channel === 'markdown') errorCategory = 'under-use';
		else if (c.channel === 'markdown' && (cls.channel === 'native' || cls.channel === 'rich'))
			errorCategory = 'over-use';
		else if (cls.channel === 'invalid') errorCategory = 'invalid';
		else errorCategory = 'other';
	} else if (c.channel === 'native' && cls.channel === 'rich') {
		errorCategory = 'rich-unnecessary';
	} else if (c.channel === 'native' && !compOk) {
		errorCategory = 'wrong-component';
	}
	if (errorCategory) tax[errorCategory] = (tax[errorCategory] ?? 0) + 1;

	results.push({
		prompt: c.prompt,
		expectedChannel: c.channel,
		expectedComponents: c.components,
		actualChannel: cls.channel,
		primaryComponent: cls.component,
		componentTree: cls.components,
		valid: cls.channel === 'native',
		fallback: cls.channel === 'invalid',
		channelOk: chOk,
		componentOk: compOk,
		latencyMs: r.latency,
		promptTokens: r.usage?.prompt_tokens ?? 0,
		completionTokens: r.usage?.completion_tokens ?? 0,
		totalTokens: r.usage?.total_tokens ?? 0,
		model: MODEL,
		reason: cls.reason ?? (cls.component ? `root=${cls.component}` : 'no ui fence'),
		errorCategory,
		raw: r.content.slice(0, 4000)
	});
	process.stdout.write(
		`${chOk ? (compOk ? '✓' : '~') : '✗'} ${cls.channel}${cls.component ? ':' + cls.component : ''}  ${c.prompt.slice(0, 46)}\n`
	);
}

const n = CASES.length;
const latencies = results.map((r) => r.latencyMs || 0).sort((a, b) => a - b);
const pct = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))] ?? 0;
const summary = {
	model: MODEL,
	total: n,
	errors,
	channelAccuracy: +(100 * channelOk / n).toFixed(1),
	componentAccuracy: +(100 * componentOk / n).toFixed(1),
	invalidRate: +(100 * invalid / n).toFixed(1),
	fallbackRate: +(100 * invalid / n).toFixed(1),
	markdownUnderUse: +(100 * tax['under-use'] / n).toFixed(1),
	uiOverUse: +(100 * tax['over-use'] / n).toFixed(1),
	richOverUse: +(100 * (tax['rich-unnecessary'] ?? 0) / n).toFixed(1),
	avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / n),
	medianLatencyMs: pct(50),
	p95LatencyMs: pct(95),
	totalTokens,
	avgTokens: Math.round(totalTokens / n),
	totalPromptTokens,
	avgPromptTokens: Math.round(totalPromptTokens / n),
	avgCompletionTokens: Math.round(totalCompletionTokens / n),
	systemPromptChars: SYSTEM.length,
	errorTaxonomy: tax
};
writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ summary, results }, null, 2));
console.log('\n=== SUMMARY (cat-jam-free, v2) ===');
console.log(JSON.stringify(summary, null, 2));
