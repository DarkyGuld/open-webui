/**
 * Intelligent UI routing benchmark (one-pass).
 *
 * Runs a set of representative prompts through the cheapest available model with
 * the SAME system prompt the Filter injects in AUTO mode, then scores whether the
 * model chose the right channel (Markdown vs native UI) and a sensible component,
 * whether the OpenUI parsed, fallback rate, latency and token cost.
 *
 * Usage: OPENCODE_KEY=... BENCH_MODEL=cat-jam-free npx tsx audit/lib/routing-benchmark.mts
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseIntelligentUI } from '../../src/lib/intelligent-ui/adapter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(REPO, 'audit/local/intelligent-ui/routing-benchmark');
mkdirSync(OUT, { recursive: true });

const KEY = process.env.OPENCODE_KEY || '';
const MODEL = process.env.BENCH_MODEL || 'cat-jam-free';
const URL = 'https://opencode.ai/zen/go/v1/chat/completions';

const py = readFileSync(
	path.join(REPO, 'backend/open_webui/intelligent_ui/catalog_prompt.py'),
	'utf8'
);
const PROMPT = /PROMPT = r"""([\s\S]*?)"""/.exec(py)?.[1] ?? '';

const AUTO_HEADER =
	'Intelligent UI is AVAILABLE but optional and conservative. Prefer normal Markdown for explanations and prose. Use Intelligent UI only when it clearly improves clarity (a side-by-side comparison, one headline metric, or tabular data).';

const SYSTEM = `${AUTO_HEADER}\n\n${PROMPT}`;

type Channel = 'markdown' | 'native' | 'rich' | 'invalid';
interface Case {
	prompt: string;
	channel: 'markdown' | 'native';
	components?: string[];
}

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
	reason?: string;
} {
	if (content.includes(':::intelligent-ui-html')) return { channel: 'rich' };
	const m = /:::intelligent-ui(?:\{[^}]*\})?\s*\n([\s\S]*?)\n:::/.exec(content);
	if (!m) return { channel: 'markdown' };
	const out = parseIntelligentUI({ version: '1', content: m[1].trim() });
	if (out.ok) {
		const components = collectTypes(out.node);
		return { channel: 'native', component: out.node.type, components };
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
			'x-opencode-session': `bench-${Math.random().toString(36).slice(2)}`
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

for (const c of CASES) {
	const r = await call(c.prompt);
	if (r.error) {
		errors++;
		results.push({ prompt: c.prompt, expected: c.channel, got: 'error', error: r.error, latency: r.latency });
		continue;
	}
	const cls = classify(r.content);
	const chOk =
		(cls.channel === c.channel) ||
		(c.channel === 'native' && (cls.channel === 'native' || cls.channel === 'rich'));
	const compOk =
		c.channel === 'native'
			? (c.components ?? []).some((x) => (cls.components ?? []).includes(x))
			: chOk;
	if (chOk) channelOk++;
	if (compOk) componentOk++;
	if (cls.channel === 'invalid') invalid++;
	totalTokens += (r.usage?.total_tokens ?? 0);
	results.push({
		prompt: c.prompt,
		expected: c.channel,
		expectedComponents: c.components,
		got: cls.channel,
		component: cls.component,
		components: cls.components,
		channelOk: chOk,
		componentOk: compOk,
		latency: r.latency,
		tokens: r.usage?.total_tokens ?? 0
	});
	process.stdout.write(
		`${chOk ? (compOk ? '✓' : '~') : '✗'} ${cls.channel}${cls.component ? ':' + cls.component : ''}  ${c.prompt.slice(0, 46)}\n`
	);
}

const n = CASES.length;
const summary = {
	model: MODEL,
	total: n,
	errors,
	channelAccuracy: +(100 * channelOk / n).toFixed(1),
	componentAccuracy: +(100 * componentOk / n).toFixed(1),
	invalidRate: +(100 * invalid / n).toFixed(1),
	fallbackRate: +(100 * invalid / n).toFixed(1),
	avgLatencyMs: Math.round(results.reduce((a, r) => a + (r.latency || 0), 0) / n),
	totalTokens,
	avgTokens: Math.round(totalTokens / n)
};
writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ summary, results }, null, 2));
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
