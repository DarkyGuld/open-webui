import { describe, it, expect } from 'vitest';
import { createIntelligentUIRuntime, parseIntelligentUI } from '../adapter';

const CALC = `$seats = 8
root = Stack([s1, m1])
s1 = Slider("Seats", $seats, 1, 50)
m1 = Metric("Monthly price", total, "Incl. VAT")
total = $seats * 29`;

describe('intelligent-ui logic layer (lang-core runtime)', () => {
	it('evaluates $state + derived expression', () => {
		const out = parseIntelligentUI({ version: '1', content: CALC });
		expect(out.ok).toBe(true);
		if (!out.ok || out.node.type !== 'stack') return;
		const metric = out.node.children[1];
		expect(metric.type).toBe('metric');
		if (metric.type === 'metric') expect(metric.value).toBe('232');
	});

	it('exposes two-way binding and re-evaluates on setState', () => {
		const out = createIntelligentUIRuntime({ version: '1', content: CALC });
		expect(out.ok).toBe(true);
		if (!out.ok || !out.runtime) return;

		const slider = out.node.type === 'stack' ? out.node.children[0] : null;
		expect(slider?.type).toBe('slider');
		if (slider?.type === 'slider') {
			expect(slider.binding).toBe('$seats');
			expect(slider.value).toBe(8);
		}

		out.runtime.setState('$seats', 20);
		const tree = out.runtime.evaluate();
		if (tree.type === 'stack') {
			const metric = tree.children[1];
			if (metric.type === 'metric') expect(metric.value).toBe('580');
			const slider2 = tree.children[0];
			if (slider2.type === 'slider') expect(slider2.value).toBe(20);
		}
	});

	it('supports ternary conditionals', () => {
		const prog = `$n = 5
root = Metric("x", $n > 3 ? "high" : "low")`;
		const out = parseIntelligentUI({ version: '1', content: prog });
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'metric') expect(out.node.value).toBe('high');
	});

	it('expands @Each loops into children', () => {
		const prog = `$items = ["A", "B", "C"]
root = Stack([l1])
l1 = Section("Items", [@Each($items, item, Badge(item))])`;
		const out = parseIntelligentUI({ version: '1', content: prog });
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'stack') {
			const section = out.node.children[0];
			expect(section.type).toBe('section');
			if (section.type === 'section') {
				expect(section.children).toHaveLength(3);
				expect(section.children[0].type).toBe('badge');
			}
		}
	});

	it('rejects malformed logic safely (no throw)', () => {
		const out = parseIntelligentUI({ version: '1', content: 'root = Metric("x", $undefinedVar)' });
		expect(typeof out.ok).toBe('boolean');
	});
});
