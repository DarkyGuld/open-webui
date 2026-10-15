import { describe, it, expect, beforeEach } from 'vitest';

// Minimal localStorage mock (node env has none).
const store = new Map<string, string>();
(globalThis as any).localStorage = {
	getItem: (k: string) => store.get(k) ?? null,
	setItem: (k: string, v: string) => store.set(k, String(v)),
	removeItem: (k: string) => store.delete(k)
};

import { loadState, saveState } from '../state';

describe('intelligent-ui durable state', () => {
	beforeEach(() => store.clear());

	it('round-trips meaningful state', () => {
		saveState('chat1', 'blk1', { selected: 'pro' });
		expect(loadState('chat1', 'blk1')).toEqual({ selected: 'pro' });
	});

	it('isolates state by chat + block', () => {
		saveState('chat1', 'blk1', { selected: 'a' });
		expect(loadState('chat2', 'blk1')).toEqual({});
		expect(loadState('chat1', 'blk2')).toEqual({});
	});

	it('ignores oversized state', () => {
		saveState('c', 'b', { big: 'x'.repeat(10_000) });
		expect(loadState('c', 'b')).toEqual({});
	});

	it('returns empty object for missing/corrupt state', () => {
		store.set('intelligent-ui-state-v1:c:b', 'not json');
		expect(loadState('c', 'b')).toEqual({});
	});
});
