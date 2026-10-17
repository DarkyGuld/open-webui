import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createInteractionScope, loadControlState, saveControlState, safeControlValues } from '../interaction-state';
import type { UINode } from '../types';

const node: UINode = { type: 'stack', children: [
	{ type: 'slider', label: 'Seats', min: 1, max: 50, value: 8, binding: '$seats' },
	{ type: 'switch', label: 'Yearly', value: false, binding: '$yearly' },
	{ type: 'select', label: 'Plan', value: 'Basic', options: ['Basic', 'Pro'], binding: '$plan' },
	{ type: 'input', label: 'Private', value: '', binding: '$private' },
	{ type: 'textarea', label: 'Notes', value: '', binding: '$notes' },
	{ type: 'comparison', selectable: true, items: [{ name: 'Basic', attributes: [] }, { name: 'Pro', attributes: [] }] }
] };
const data = new Map<string, string>();
beforeEach(() => {
	data.clear();
	vi.stubGlobal('crypto', webcrypto);
	vi.stubGlobal('localStorage', {
		get length() { return data.size; }, key: (i: number) => [...data.keys()][i] ?? null,
		getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v),
		removeItem: (k: string) => data.delete(k)
	});
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('M9.12 privacy-safe persistence slice', () => {
	it('restores eligible controls and selections without saving typed text or arbitrary variables', async () => {
		const scope = (await createInteractionScope('u', 'c', 'b', 'program'))!;
		saveControlState(scope, node, { $seats: 20, $yearly: true, $plan: 'Pro', _selection: 'Pro',
			$private: 'a private address', $notes: 'confidential', $other: 42 });
		expect(loadControlState(scope, node)).toEqual({ $seats: 20, $yearly: true, $plan: 'Pro', _selection: 'Pro' });
		expect([...data.values()].join('')).not.toContain('confidential');
		expect([...data.values()].join('')).not.toContain('a private address');
	});
	it('user, chat, block, and exact program all isolate state (edits/regeneration reset)', async () => {
		const scope = (await createInteractionScope('u', 'c', 'b', 'program'))!;
		saveControlState(scope, node, { $seats: 20 });
		for (const args of [['u2', 'c', 'b', 'program'], ['u', 'c2', 'b', 'program'],
			['u', 'c', 'b2', 'program'], ['u', 'c', 'b', 'changed program']]) {
			const other = (await createInteractionScope(...args as [string, string, string, string]))!;
			expect(loadControlState(other, node)).toEqual({});
		}
	});
	it.each([
		{ $seats: 51 }, { $seats: -1 }, { $seats: NaN }, { $seats: Infinity },
		{ $seats: '20' }, { $yearly: 'true' }, { $plan: 'invented' }, { _selection: 'invented' }
	])('rejects invalid/tampered controls %o', (values) => {
		expect(safeControlValues(node, values)).toEqual({});
	});
	it('bounds the namespace to 32 entries and never deletes other application data', async () => {
		data.set('unrelated', 'keep');
		for (let i = 0; i < 40; i++) {
			const scope = (await createInteractionScope('u', 'c', `b${i}`, 'program'))!;
			saveControlState(scope, node, { $seats: 20 });
		}
		expect(data.size).toBe(33);
		expect(data.get('unrelated')).toBe('keep');
		const newest = (await createInteractionScope('u', 'c', 'b39', 'program'))!;
		expect(loadControlState(newest, node)).toEqual({ $seats: 20 });
	});
	it('corrupt/oversized/expired storage never breaks rendering', async () => {
		const scope = (await createInteractionScope('u', 'c', 'b', 'program'))!;
		for (const raw of ['broken', 'x'.repeat(5000), JSON.stringify({ at: 0, values: { $seats: 30 } })]) {
			data.set(scope.key, raw);
			expect(loadControlState(scope, node)).toEqual({});
		}
	});
	it('does not create a scope without an authenticated user/chat/block', async () => {
		expect(await createInteractionScope('', 'c', 'b', 'p')).toBeNull();
		expect(await createInteractionScope('u', '', 'b', 'p')).toBeNull();
	});
	it('survives unavailable browser storage', async () => {
		const scope = (await createInteractionScope('u', 'c', 'b', 'program'))!;
		vi.stubGlobal('localStorage', { getItem: () => { throw new Error('disabled'); },
			setItem: () => { throw new Error('quota'); } });
		expect(loadControlState(scope, node)).toEqual({});
		expect(() => saveControlState(scope, node, { $seats: 20 })).not.toThrow();
	});
});
