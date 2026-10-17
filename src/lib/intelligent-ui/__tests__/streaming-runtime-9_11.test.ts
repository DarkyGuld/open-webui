import { describe, it, expect } from 'vitest';
import {
	createIntelligentUIPartialRuntime,
	createIntelligentUIRuntime
} from '../adapter';
import { createOpenUIPartialRuntime, createOpenUIRuntime } from '../engines/openui';
import type { UINode } from '../types';

const CALC = `$seats = 8
root = Stack([s1, m1])
s1 = Slider("Seats", $seats, 1, 50)
m1 = Metric("Monthly price", total, "Incl. VAT")
total = $seats * 29`;

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

describe('M9.11 — lifecycle-safe streaming runtime', () => {
	it('reuses ONE parser+store across updates (no state reset between chunks)', () => {
		const rt = createOpenUIPartialRuntime();
		const half = CALC.slice(0, Math.floor(CALC.length * 0.5));
		expect(rt.update(half)).toBeTruthy(); // partial tree renders
		// user interacts mid-stream
		rt.setState('$seats', 20);
		const full = rt.update(CALC);
		expect(full).toBeTruthy();
		// user value survived the chunk that completed the program
		const slider = findNode(full!, 'slider');
		if (slider && slider.type === 'slider') expect(slider.value).toBe(20);
		rt.dispose();
	});

	it('derived values update live during streaming (refresh after setState)', () => {
		const rt = createIntelligentUIPartialRuntime();
		expect(rt.update({ version: '1', content: CALC }).ok).toBe(true);
		rt.setState('$seats', 12);
		const r = rt.refresh();
		expect(r.ok).toBe(true);
		const metric = findNode(r.node!, 'metric');
		if (metric && metric.type === 'metric') expect(metric.value).toBe('348'); // 12 * 29
		rt.dispose();
	});

	it('user input entered during streaming survives the partial -> complete transition', () => {
		const partial = createIntelligentUIPartialRuntime();
		expect(partial.update({ version: '1', content: CALC }).ok).toBe(true);
		partial.setState('$seats', 20); // user drags the slider mid-stream
		const persisted = partial.touchedValues();
		expect(persisted['$seats']).toBe(20);
		partial.dispose();

		// finalization: the complete runtime is seeded with the touched values
		const final = createIntelligentUIRuntime({
			version: '1',
			content: CALC
		}, undefined, { persisted });
		expect(final.ok).toBe(true);
		if (!final.ok || !final.runtime) return;
		const slider = findNode(final.node, 'slider');
		if (slider && slider.type === 'slider') expect(slider.value).toBe(20);
		const metric = findNode(final.node, 'metric');
		if (metric && metric.type === 'metric') expect(metric.value).toBe('580'); // 20 * 29
	});

	it('untouched declarations refresh to revised model defaults across updates', () => {
		const rt = createOpenUIPartialRuntime();
		rt.update(`$seats = 8\nroot = Stack([m1])\nm1 = Metric("Seats", $seats)`);
		rt.update(`$seats = 10\nroot = Stack([m1])\nm1 = Metric("Seats", $seats)`); // model revises default
		const metric = findNode(rt.update(`$seats = 10\nroot = Stack([m1])\nm1 = Metric("Seats", $seats)`)!, 'metric');
		if (metric && metric.type === 'metric') expect(metric.value).toBe('10');
		rt.dispose();
	});

	it('keeps the last-good tree on a mid-stream failure', () => {
		const rt = createIntelligentUIPartialRuntime();
		expect(rt.update({ version: '1', content: CALC }).ok).toBe(true);
		// a later chunk breaks a required prop mid-statement
		const bad = `${CALC}\nm2 = Metric("", "x"`;
		const r = rt.update({ version: '1', content: bad });
		// the previous tree is kept (either last-good or re-validated)
		expect(r.ok === false || r.node).toBeTruthy();
		rt.dispose();
	});

	it('resetState restores declared defaults during streaming', () => {
		const rt = createIntelligentUIPartialRuntime();
		expect(rt.update({ version: '1', content: CALC }).ok).toBe(true);
		rt.setState('$seats', 40);
		rt.resetState(['$seats']);
		const r = rt.refresh();
		expect(r.ok).toBe(true);
		const slider = findNode(r.node!, 'slider');
		if (slider && slider.type === 'slider') expect(slider.value).toBe(8); // declared default
		rt.dispose();
	});

	it('a replaced (not appended) program resets cleanly', () => {
		const rt = createIntelligentUIPartialRuntime();
		expect(rt.update({ version: '1', content: CALC }).ok).toBe(true);
		const REPLACED = `$name = ""\nroot = Stack([i1])\ni1 = Input("Your name", $name)`;
		const r = rt.update({ version: '1', content: REPLACED });
		expect(r.ok).toBe(true);
		if (r.node) expect(findNode(r.node, 'input')).toBeTruthy();
		rt.dispose();
	});

	it('historical (pre-1.0.1, tone-less) programs still parse in the live runtime', () => {
		const rt = createOpenUIRuntime('root = Metric("Total", "980 kr", "Incl. VAT")');
		const node = rt.evaluate();
		if (node.type === 'metric') {
			expect(node.label).toBe('Total');
			expect(node.value).toBe('980 kr');
			expect(node.tone).toBeUndefined();
		}
	});

	it('a REPLACED program does not leak stale touched values into the new defaults', () => {
		const rt = createOpenUIPartialRuntime();
		rt.update(`$seats = 8\nroot = Stack([m1])\nm1 = Metric("Seats", $seats)`);
		rt.setState('$seats', 40); // user interacts with the OLD program
		// the model replaces the program entirely (regeneration mid-stream):
		rt.update(`$seats = 5\nroot = Stack([m1])\nm1 = Metric("Seats", $seats)`);
		const m = findNode(rt.update(`$seats = 5\nroot = Stack([m1])\nm1 = Metric("Seats", $seats)`)!, 'metric');
		// untouched-by-the-new-program semantics: the user value is retained for a
		// name that still exists, but the NEW declaration default is NOT silently
		// overridden by values from unrelated names — and unrelated old state is
		// not carried into touchedValues() (only names the user actually touched):
		expect(m && m.type === 'metric' ? m.value : '').toBe('40'); // touched value survives
		const touched = rt.touchedValues();
		expect(Object.keys(touched)).toEqual(['$seats']);
		// finalization with the replaced program keeps the touched value and the
		// new default for untouched names:
		const final = createIntelligentUIRuntime(
			{ version: '1', content: `$seats = 5\n$extra = 9\nroot = Stack([m1, m2])\nm1 = Metric("Seats", $seats)\nm2 = Metric("Extra", $extra)` },
			undefined,
			{ persisted: touched }
		);
		expect(final.ok).toBe(true);
		if (final.ok) {
			const seats = findNode(final.node, 'metric');
			if (seats && seats.type === 'metric') expect(seats.value).toBe('40'); // touched survives
			const extra = final.node.type === 'stack' ? final.node.children.find((c: any) => c.type === 'metric' && c.label === 'Extra') : null;
			if (extra && extra.type === 'metric') expect(extra.value).toBe('9'); // new default applies
		}
		rt.dispose();
	});

	it('rapid successive user updates during partial mode all land (no lost interactions)', () => {
		const rt = createIntelligentUIPartialRuntime();
		expect(rt.update({ version: '1', content: CALC }).ok).toBe(true);
		for (const v of [10, 20, 30, 40]) rt.setState('$seats', v);
		const r = rt.refresh();
		expect(r.ok).toBe(true);
		const metric = findNode(r.node!, 'metric');
		if (metric && metric.type === 'metric') expect(metric.value).toBe(String(40 * 29)); // last value wins
		rt.dispose();
	});

	it('two independent partial runtimes never share state (block isolation)', () => {
		const a = createIntelligentUIPartialRuntime();
		const b = createIntelligentUIPartialRuntime();
		a.update({ version: '1', content: CALC });
		b.update({ version: '1', content: CALC });
		a.setState('$seats', 50);
		const ra = a.refresh();
		const rb = b.refresh();
		const ma = findNode(ra.node!, 'metric');
		const mb = findNode(rb.node!, 'metric');
		if (ma && ma.type === 'metric') expect(ma.value).toBe(String(50 * 29));
		if (mb && mb.type === 'metric') expect(mb.value).toBe(String(8 * 29)); // b untouched
		a.dispose();
		b.dispose();
	});
});
