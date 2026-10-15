import { describe, it, expect } from 'vitest';
import { parseIntelligentUI } from '../adapter';
import { validateNode } from '../validation';
import { LIMITS } from '../limits';
import type { UINode } from '../types';

const NESTED = `root = Stack([g1, t1])
g1 = Grid([c1, c2])
c1 = Card("Cost", [m1])
m1 = Metric("Monthly cost", "5 294 kr", "Incl. VAT")
c2 = Card("Seats", [m2])
m2 = Metric("Seats", "8")
t1 = Section("Breakdown", [tbl])
tbl = Table("", ["Item", "Price"], [["Compute", "3 200 kr"]])`;

describe('intelligent-ui layout composition', () => {
	it('parses a recursive layout tree (Stack > Grid > Card > Metric)', () => {
		const out = parseIntelligentUI({ version: '1', content: NESTED });
		expect(out.ok).toBe(true);
		if (!out.ok) return;
		const root = out.node;
		expect(root.type).toBe('stack');
		if (root.type !== 'stack') return;
		expect(root.children).toHaveLength(2);
		const grid = root.children[0];
		expect(grid.type).toBe('grid');
		if (grid.type !== 'grid') return;
		expect(grid.children[0].type).toBe('card');
		const card = grid.children[0];
		if (card.type !== 'card') return;
		expect(card.title).toBe('Cost');
		expect(card.children[0].type).toBe('metric');
	});

	it('rejects a tree that is too deep', () => {
		let node: UINode = { type: 'divider' };
		for (let i = 0; i < LIMITS.MAX_DEPTH + 1; i++) {
			node = { type: 'stack', children: [node] };
		}
		const r = validateNode(node);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.reason).toContain('deep');
	});

	it('rejects a tree with too many nodes', () => {
		const many: UINode[] = Array.from({ length: LIMITS.MAX_CHILDREN }, () => ({ type: 'divider' }));
		const container: UINode = { type: 'stack', children: many };
		const grid: UINode = {
			type: 'grid',
			children: Array.from({ length: LIMITS.MAX_CHILDREN }, () => container)
		};
		const r = validateNode(grid);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.reason).toContain('nodes');
	});

	it('accepts a shallow layout', () => {
		const r = validateNode({ type: 'stack', children: [{ type: 'divider' }] });
		expect(r.ok).toBe(true);
	});
});
