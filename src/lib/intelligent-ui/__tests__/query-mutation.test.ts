import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryRegistry, isKnownQuery, runQuery, QUERY_IDS } from '../queries';
import { mutationRegistry, getMutation, MUTATION_IDS } from '../mutations';

function mockFetch(handler: (url: string) => any) {
	(globalThis as any).fetch = vi.fn(async (url: string) => {
		const r = handler(String(url));
		if (r instanceof Error) throw r;
		return { ok: true, status: 200, json: async () => r };
	});
}

describe('intelligent-ui query registry (allow-list)', () => {
	beforeEach(() => {
		(globalThis as any).fetch = undefined;
	});

	it('exposes only the allow-listed read-only queries', () => {
		expect([...QUERY_IDS].sort()).toEqual([
			'conversation.notes',
			'knowledge.collections',
			'library.files'
		]);
	});

	it('rejects unknown query ids', async () => {
		expect(isKnownQuery('bogus')).toBe(false);
		await expect(runQuery('bogus', 't')).rejects.toThrow('unknown query');
	});

	it('normalizes a successful result to columns/rows', async () => {
		mockFetch(() => [{ title: 'A', updated_at: 1700000000 }, { title: 'B' }]);
		const res = await runQuery('conversation.notes', 't');
		expect(res.columns).toEqual(['Title', 'Updated']);
		expect(res.rows[0][0]).toBe('A');
		expect(res.rows.length).toBe(2);
	});

	it('caps the number of rows', async () => {
		mockFetch(() => Array.from({ length: 200 }, (_, i) => ({ title: `n${i}` })));
		const res = await runQuery('conversation.notes', 't');
		expect(res.rows.length).toBeLessThanOrEqual(50);
	});

	it('propagates backend errors (no raw object leaks)', async () => {
		(globalThis as any).fetch = vi.fn(async () => ({ ok: false, status: 500 }));
		await expect(runQuery('library.files', 't')).rejects.toThrow('http 500');
	});

	it('has a definition for every id', () => {
		for (const id of QUERY_IDS) expect(queryRegistry[id].run).toBeTypeOf('function');
	});
});

describe('intelligent-ui mutation registry (allow-list + risk)', () => {
	it('exposes only the allow-listed mutations', () => {
		expect([...MUTATION_IDS]).toEqual(['notes.create']);
	});

	it('unknown mutation -> null', () => {
		expect(getMutation('bogus')).toBeNull();
		expect(getMutation('files.delete')).toBeNull();
	});

	it('mutations are confirm-risk (never auto-run)', () => {
		expect(mutationRegistry['notes.create'].risk).toBe('confirm');
	});
});
