import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseIntelligentUI } from '../adapter';

const fixture = (name: string): string =>
	readFileSync(
		fileURLToPath(new URL(`../../../../tests/fixtures/intelligent-ui/${name}`, import.meta.url)),
		'utf8'
	);

/**
 * These fixtures are REAL model outputs captured from live runs (filter injection
 * -> model -> :::intelligent-ui block). They prove the model's actual output
 * validates and renders.
 */
describe('intelligent-ui — real model-generated outputs', () => {
	it('parses a model-generated comparison (with hoisted references)', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('generated-comparison.txt') });
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'comparison') {
			expect(out.node.items).toHaveLength(3);
			expect(out.node.items[0].name).toBe('Basic');
		}
	});

	it('parses a model-generated metric', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('generated-metric.txt') });
		expect(out.ok).toBe(true);
		if (out.ok) expect(out.node.type).toBe('metric');
	});

	it('parses a model-generated table', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('generated-table.txt') });
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'table') {
			expect(out.node.columns).toEqual(['Item', 'Cost', 'Notes']);
			expect(out.node.rows).toHaveLength(3);
		}
	});
});
