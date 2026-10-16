import { describe, it, expect } from 'vitest';
import { parseIntelligentUI } from '../adapter';
import { validateNode } from '../validation';

describe('M9.8 — contract hardening', () => {
	describe('Metric label contract', () => {
		it('accepts a semantic non-empty label', () => {
			const out = parseIntelligentUI({ version: '1', content: 'root = Metric("Total", "980 kr")' });
			expect(out.ok).toBe(true);
			if (out.ok && out.node.type === 'metric') expect(out.node.label).toBe('Total');
		});

		it('rejects an empty label (validation)', () => {
			expect(validateNode({ type: 'metric', label: '', value: '980 kr' }).ok).toBe(false);
		});

		it('rejects an empty label at parse time', () => {
			const out = parseIntelligentUI({ version: '1', content: 'root = Metric("", "980 kr")' });
			expect(out.ok).toBe(false);
		});
	});

	describe('Badge tone contract', () => {
		it('accepts a valid tone as the 2nd argument', () => {
			const out = parseIntelligentUI({
				version: '1',
				content: 'root = Badge("Save 17%", "positive")'
			});
			expect(out.ok).toBe(true);
			if (out.ok && out.node.type === 'badge') expect(out.node.tone).toBe('positive');
		});

		it('rejects an unknown tone', () => {
			const out = parseIntelligentUI({ version: '1', content: 'root = Badge("x", "bogus")' });
			expect(out.ok).toBe(false);
		});

		it('rejects a malformed positional argument (object in the tone slot)', () => {
			const out = parseIntelligentUI({
				version: '1',
				content: 'root = Badge("x", {type:"send_prompt", prompt:"hi"})'
			});
			expect(out.ok).toBe(false);
		});

		it('validates tone via the schema', () => {
			expect(validateNode({ type: 'badge', label: 'x', tone: 'warning' }).ok).toBe(true);
			expect(validateNode({ type: 'badge', label: 'x', tone: 'loud' }).ok).toBe(false);
		});
	});

	describe('Gallery refs', () => {
		it('accepts safe image refs', () => {
			const out = parseIntelligentUI({
				version: '1',
				content: 'root = Gallery("Shots", [{src:"/favicon.png", caption:"Home"}])'
			});
			expect(out.ok).toBe(true);
			if (out.ok && out.node.type === 'gallery') expect(out.node.items[0].src).toBe('/favicon.png');
		});

		it('rejects an item with no src', () => {
			expect(validateNode({ type: 'gallery', items: [{ caption: 'x' }] }).ok).toBe(false);
		});
	});

	describe('Chart vs Table discrimination', () => {
		it('a trend parses as Chart', () => {
			const out = parseIntelligentUI({
				version: '1',
				content: 'root = Chart("line", "Trend", ["Q1","Q2"], [{name:"R", values:[1,2]}])'
			});
			expect(out.ok).toBe(true);
			if (out.ok) expect(out.node.type).toBe('chart');
		});

		it('exact values parse as Table', () => {
			const out = parseIntelligentUI({
				version: '1',
				content: 'root = Table("Exact", ["Q","Rev"], [["Q1","10"],["Q2","20"]])'
			});
			expect(out.ok).toBe(true);
			if (out.ok) expect(out.node.type).toBe('table');
		});
	});

	describe('Mixed response format', () => {
		it('a mixed message keeps prose and yields a native tree', () => {
			const content =
				'Here is the comparison:\n\n:::intelligent-ui{v="1"}\nroot = Metric("Total", "980 kr")\n:::\n\nThe total is 980 kr.';
			const m = content.match(/:::intelligent-ui\{[^}]*\}\s*\n([\s\S]*?)\n:::/);
			expect(m).toBeTruthy();
			const out = parseIntelligentUI({ version: '1', content: (m as RegExpMatchArray)[1] });
			expect(out.ok).toBe(true);
			expect(content.replace(m![0], '').trim().length).toBeGreaterThan(40);
		});
	});

	describe('native calculator preferred over Rich', () => {
		it('a native slider/metric calculator parses as native', () => {
			const content =
				'$seats = 8\nroot = Stack([s1, m1])\ns1 = Slider("Seats", $seats, 1, 50)\nm1 = Metric("Monthly price", total)\ntotal = $seats * 29';
			const out = parseIntelligentUI({ version: '1', content });
			expect(out.ok).toBe(true);
			if (out.ok) expect(out.node.type).toBe('stack');
		});

		it('a rich fence is a separate channel (not native)', () => {
			const content = ':::intelligent-ui-html{v="1"}\n<div></div>\n:::';
			expect(content.includes(':::intelligent-ui-html')).toBe(true);
		});
	});
});
