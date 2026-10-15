import { describe, it, expect } from 'vitest';
import { parseIntelligentUIPartial } from '../adapter';

describe('intelligent-ui streaming (partial parse)', () => {
	it('renders an open (unclosed) program progressively', () => {
		const out = parseIntelligentUIPartial({
			version: '1',
			content: 'root = Stack([m1])\nm1 = Metric("Monthly price", "232")'
		});
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'stack') {
			expect(out.node.children[0].type).toBe('metric');
		}
	});

	it('does not throw for a very incomplete program', () => {
		const out = parseIntelligentUIPartial({ version: '1', content: 'root = Stack([m1' });
		expect(typeof out.ok).toBe('boolean');
	});

	it('parses a partial layout (Stack + Grid + Card)', () => {
		const out = parseIntelligentUIPartial({
			version: '1',
			content: 'root = Stack([g1])\ng1 = Grid([c1])\nc1 = Card("Cost", [m1])\nm1 = Metric("Total", "100")'
		});
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'stack') {
			expect(out.node.children[0].type).toBe('grid');
		}
	});
});
