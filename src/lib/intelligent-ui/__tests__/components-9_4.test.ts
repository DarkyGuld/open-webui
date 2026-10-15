import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseIntelligentUI, parseIntelligentUIPartial, createIntelligentUIRuntime } from '../adapter';
import { validateNode } from '../validation';
import { LIMITS } from '../limits';
import { chartDataFromQuery, timelineFromQuery, firstNumeric } from '../query-binding';
import { loadState, saveState } from '../state';
import type { UINode } from '../types';

// Minimal localStorage mock (node env has none) for the durable-state test.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
	getItem: (k: string) => store.get(k) ?? null,
	setItem: (k: string, v: string) => store.set(k, String(v)),
	removeItem: (k: string) => store.delete(k)
};

const fixture = (name: string): string =>
	readFileSync(
		fileURLToPath(new URL(`../../../../tests/fixtures/intelligent-ui/${name}`, import.meta.url)),
		'utf8'
	);

function findNode(node: UINode, type: string): UINode | null {
	if (node.type === type) return node;
	const children = (node as any).children as UINode[] | undefined;
	if (Array.isArray(children)) {
		for (const c of children) {
			const found = findNode(c, type);
			if (found) return found;
		}
	}
	return null;
}

describe('M9.4 — composition & component breadth', () => {
	describe('fixtures parse and validate', () => {
		for (const name of [
			'm94-dashboard.txt',
			'm94-pricing.txt',
			'm94-analytics.txt',
			'm94-form.txt',
			'm94-gallery.txt',
			'm94-nested.txt'
		]) {
			it(`parses ${name}`, () => {
				const out = parseIntelligentUI({ version: '1', content: fixture(name) });
				expect(out.ok).toBe(true);
			});
		}

		it('rejects an oversized layout (fallback path)', () => {
			const out = parseIntelligentUI({ version: '1', content: fixture('m94-invalid-limit.txt') });
			expect(out.ok).toBe(false);
			if (!out.ok) expect(out.reason.length).toBeGreaterThan(0);
		});
	});

	describe('layout nesting', () => {
		it('composes Stack > Section > Grid > Card > Metric', () => {
			const out = parseIntelligentUI({ version: '1', content: fixture('m94-nested.txt') });
			expect(out.ok).toBe(true);
			if (!out.ok) return;
			expect(out.node.type).toBe('stack');
			expect(findNode(out.node, 'section')).toBeTruthy();
			expect(findNode(out.node, 'grid')).toBeTruthy();
			expect(findNode(out.node, 'card')).toBeTruthy();
			expect(findNode(out.node, 'metric')).toBeTruthy();
		});

		it('accepts a tree at exactly MAX_DEPTH', () => {
			let node: UINode = { type: 'divider' };
			for (let i = 0; i < LIMITS.MAX_DEPTH - 1; i++) node = { type: 'stack', children: [node] };
			expect(validateNode(node).ok).toBe(true);
		});

		it('rejects a tree beyond MAX_DEPTH', () => {
			let node: UINode = { type: 'divider' };
			for (let i = 0; i < LIMITS.MAX_DEPTH + 1; i++) node = { type: 'stack', children: [node] };
			const r = validateNode(node);
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.reason).toContain('deep');
		});
	});

	describe('tabs', () => {
		it('parses Tabs with Tab children (label + children)', () => {
			const out = parseIntelligentUI({ version: '1', content: fixture('m94-pricing.txt') });
			expect(out.ok).toBe(true);
			if (!out.ok) return;
			const tabs = findNode(out.node, 'tabs');
			expect(tabs).toBeTruthy();
			if (tabs && tabs.type === 'tabs') {
				expect(tabs.children).toHaveLength(2);
				expect(tabs.children[0].type).toBe('tab');
				if (tabs.children[0].type === 'tab') expect(tabs.children[0].title).toBe('Plans');
			}
		});

		it('rejects Tabs whose children are not Tab', () => {
			const bad: UINode = {
				type: 'tabs',
				children: [{ type: 'metric', label: 'x', value: '1' }]
			};
			const r = validateNode(bad);
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.reason).toMatch(/Tab/);
		});
	});

	describe('charts', () => {
		it('parses a typed chart', () => {
			const out = parseIntelligentUI({ version: '1', content: fixture('m94-dashboard.txt') });
			expect(out.ok).toBe(true);
			if (!out.ok) return;
			const chart = findNode(out.node, 'chart');
			expect(chart).toBeTruthy();
			if (chart && chart.type === 'chart') {
				expect(chart.chartType).toBe('bar');
				expect(chart.labels).toHaveLength(4);
				expect(chart.series[0].values).toHaveLength(4);
			}
		});

		it('parses a query-backed chart (no inline data)', () => {
			const out = parseIntelligentUI({ version: '1', content: fixture('m94-analytics.txt') });
			expect(out.ok).toBe(true);
			if (!out.ok) return;
			const chart = findNode(out.node, 'chart');
			if (chart && chart.type === 'chart') expect(chart.source).toBe('library.files');
		});

		it('rejects too many series', () => {
			const node: UINode = {
				type: 'chart',
				chartType: 'bar',
				labels: ['a'],
				series: Array.from({ length: LIMITS.MAX_CHART_SERIES + 1 }, (_, i) => ({
					name: `s${i}`,
					values: [1]
				}))
			};
			expect(validateNode(node).ok).toBe(false);
		});

		it('rejects too many points', () => {
			const node: UINode = {
				type: 'chart',
				chartType: 'line',
				labels: Array.from({ length: LIMITS.MAX_CHART_POINTS + 1 }, (_, i) => `l${i}`),
				series: [
					{
						name: 's',
						values: Array.from({ length: LIMITS.MAX_CHART_POINTS + 1 }, () => 1)
					}
				]
			};
			expect(validateNode(node).ok).toBe(false);
		});

		it('rejects an unknown chart type', () => {
			const node: any = { type: 'chart', chartType: 'radar', labels: [], series: [] };
			expect(validateNode(node).ok).toBe(false);
		});
	});

	describe('progress', () => {
		it('parses and derives from state', () => {
			const out = parseIntelligentUI({ version: '1', content: fixture('m94-analytics.txt') });
			expect(out.ok).toBe(true);
			if (!out.ok) return;
			const p = findNode(out.node, 'progress');
			if (p && p.type === 'progress') expect(p.value).toBe(64);
		});

		it('rejects values outside 0-100', () => {
			expect(validateNode({ type: 'progress', value: 101 }).ok).toBe(false);
			expect(validateNode({ type: 'progress', value: -1 }).ok).toBe(false);
			expect(validateNode({ type: 'progress', value: 0 }).ok).toBe(true);
			expect(validateNode({ type: 'progress', value: 100 }).ok).toBe(true);
		});
	});

	describe('timeline', () => {
		it('parses ordered events with status', () => {
			const out = parseIntelligentUI({ version: '1', content: fixture('m94-analytics.txt') });
			expect(out.ok).toBe(true);
			if (!out.ok) return;
			const tl = findNode(out.node, 'timeline');
			if (tl && tl.type === 'timeline') {
				expect(tl.items).toHaveLength(3);
				expect(tl.items[0].status).toBe('done');
			}
		});

		it('rejects too many items', () => {
			const node: UINode = {
				type: 'timeline',
				items: Array.from({ length: LIMITS.MAX_TIMELINE_ITEMS + 1 }, (_, i) => ({ title: `e${i}` }))
			};
			expect(validateNode(node).ok).toBe(false);
		});
	});

	describe('gallery', () => {
		it('parses media items', () => {
			const out = parseIntelligentUI({ version: '1', content: fixture('m94-gallery.txt') });
			expect(out.ok).toBe(true);
			if (!out.ok) return;
			const g = findNode(out.node, 'gallery');
			if (g && g.type === 'gallery') expect(g.items).toHaveLength(2);
		});

		it('rejects too many items', () => {
			const node: UINode = {
				type: 'gallery',
				items: Array.from({ length: LIMITS.MAX_GALLERY_ITEMS + 1 }, () => ({ src: '/x.png' }))
			};
			expect(validateNode(node).ok).toBe(false);
		});
	});

	describe('richer forms', () => {
		it('parses a form with fields, radio, textarea and a mutation button', () => {
			const out = parseIntelligentUI({ version: '1', content: fixture('m94-form.txt') });
			expect(out.ok).toBe(true);
			if (!out.ok) return;
			expect(out.node.type).toBe('form');
			expect(findNode(out.node, 'field')).toBeTruthy();
			expect(findNode(out.node, 'radio')).toBeTruthy();
			expect(findNode(out.node, 'textarea')).toBeTruthy();
			const btn = findNode(out.node, 'button');
			if (btn && btn.type === 'button') {
				expect(Array.isArray(btn.action) ? btn.action[0] : btn.action).toMatchObject({
					type: 'run',
					id: 'notes.create'
				});
			}
		});

		it('exposes two-way bindings for form inputs', () => {
			const out = createIntelligentUIRuntime({ version: '1', content: fixture('m94-form.txt') });
			expect(out.ok).toBe(true);
			if (!out.ok || !out.runtime) return;
			const input = findNode(out.node, 'input');
			if (input && input.type === 'input') expect(input.binding).toBe('$title');
			out.runtime.setState('$title', 'Hello');
			const tree = out.runtime.evaluate();
			const input2 = findNode(tree, 'input');
			if (input2 && input2.type === 'input') expect(input2.value).toBe('Hello');
		});

		it('rejects a form with too many fields', () => {
			const node: UINode = {
				type: 'form',
				children: Array.from({ length: LIMITS.MAX_FORM_FIELDS + 1 }, () => ({ type: 'divider' }))
			};
			expect(validateNode(node).ok).toBe(false);
		});
	});

	describe('query-backed derivations (shared mechanism)', () => {
		it('chartDataFromQuery maps column 0 to labels and the rest to series', () => {
			const result = {
				columns: ['Month', 'Revenue', 'Cost'],
				rows: [
					['Jan', 10, 5],
					['Feb', 20, 7]
				] as (string | number)[][]
			};
			const { labels, series } = chartDataFromQuery(result);
			expect(labels).toEqual(['Jan', 'Feb']);
			expect(series.map((s) => s.name)).toEqual(['Revenue', 'Cost']);
			expect(series[0].values).toEqual([10, 20]);
		});

		it('drops non-numeric columns from a query result', () => {
			const result = {
				columns: ['Name', 'Kind', 'Size'],
				rows: [
					['a', 'text/plain', 10],
					['b', 'text/plain', 20]
				] as (string | number)[][]
			};
			const { labels, series } = chartDataFromQuery(result);
			expect(labels).toEqual(['a', 'b']);
			expect(series.map((s) => s.name)).toEqual(['Size']);
			expect(series[0].values).toEqual([10, 20]);
		});

		it('timelineFromQuery maps rows and filters invalid status', () => {
			const result = {
				columns: ['Title', 'When', 'Desc', 'Status'],
				rows: [
					['A', '2026-01-01', 'x', 'done'],
					['B', '', '', 'bogus']
				] as (string | number)[][]
			};
			const items = timelineFromQuery(result);
			expect(items[0].status).toBe('done');
			expect(items[1].status).toBeUndefined();
			expect(items[1].timestamp).toBeUndefined();
		});

		it('firstNumeric returns the first finite numeric cell', () => {
			expect(
				firstNumeric({ columns: ['a'], rows: [['x'], ['42'], ['99']] as (string | number)[][] })
			).toBe(42);
			expect(firstNumeric({ columns: ['a'], rows: [['x']] })).toBeNull();
		});
	});

	describe('streaming compatibility', () => {
		it('a partially-received nested layout never throws', () => {
			const full = fixture('m94-dashboard.txt');
			const partial = full.slice(0, Math.floor(full.length * 0.6));
			const out = parseIntelligentUIPartial({ version: '1', content: partial });
			expect(typeof out.ok).toBe('boolean');
		});

		it('the final complete program is authoritative', () => {
			const out = parseIntelligentUIPartial({ version: '1', content: fixture('m94-dashboard.txt') });
			expect(out.ok).toBe(true);
		});
	});

	describe('durable state', () => {
		it('round-trips nested interaction state', () => {
			saveState('chat-x', 'blk-1', { activeTab: 1, selected: 'Pro' });
			expect(loadState('chat-x', 'blk-1')).toMatchObject({ activeTab: 1, selected: 'Pro' });
		});
	});

	describe('fallback / OFF behavior', () => {
		it('empty content falls back safely', () => {
			const out = parseIntelligentUI({ version: '1', content: '' });
			expect(out.ok).toBe(false);
		});

		it('unsupported version falls back safely', () => {
			const out = parseIntelligentUI({ version: '9', content: fixture('m94-dashboard.txt') });
			expect(out.ok).toBe(false);
			if (!out.ok) expect(out.reason).toContain('version');
		});
	});
});
