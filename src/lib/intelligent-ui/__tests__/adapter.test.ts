import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseIntelligentUI } from '../adapter';
import { LIMITS } from '../limits';

const fixture = (name: string): string =>
	readFileSync(
		fileURLToPath(new URL(`../../../../tests/fixtures/intelligent-ui/${name}`, import.meta.url)),
		'utf8'
	);

describe('intelligent-ui adapter — valid', () => {
	it('parses a valid metric', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('metric-valid.txt') });
		expect(out.ok).toBe(true);
		if (out.ok) {
			expect(out.node.type).toBe('metric');
			expect(out.node).toMatchObject({ label: 'Monthly cost', value: '5 294 kr' });
		}
	});

	it('parses a valid comparison', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('comparison-valid.txt') });
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'comparison') {
			expect(out.node.items).toHaveLength(2);
			expect(out.node.items[0].name).toBe('Basic');
		}
	});

	it('parses a valid table', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('table-valid.txt') });
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'table') {
			expect(out.node.columns).toEqual(['Item', 'Price']);
			expect(out.node.rows).toHaveLength(3);
		}
	});

	it('unwraps a versioned JSON envelope', () => {
		const out = parseIntelligentUI({ content: fixture('valid-envelope.txt') });
		expect(out.ok).toBe(true);
		if (out.ok) expect(out.node.type).toBe('metric');
	});
});

describe('intelligent-ui adapter — invalid falls back safely', () => {
	it('rejects an unsupported version', () => {
		const out = parseIntelligentUI({ content: fixture('invalid-version.txt') });
		expect(out.ok).toBe(false);
		if (!out.ok) expect(out.reason).toContain('unsupported version');
	});

	it('rejects an unknown component', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('invalid-component.txt') });
		expect(out.ok).toBe(false);
	});

	it('rejects invalid OpenUI Lang', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('invalid-openui.txt') });
		expect(out.ok).toBe(false);
	});

	it('rejects malformed input', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('malformed.txt') });
		expect(out.ok).toBe(false);
	});

	it('rejects oversized payloads', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('oversized.txt') });
		expect(out.ok).toBe(false);
		if (!out.ok) expect(out.reason).toContain('size');
	});

	it('rejects a table with too many rows', () => {
		const rows = Array.from({ length: LIMITS.MAX_TABLE_ROWS + 5 }, () => '["a","b"]').join(',');
		const content = `root = Table("t", ["A","B"], [${rows}])`;
		expect(parseIntelligentUI({ version: '1', content }).ok).toBe(false);
	});

	it('rejects a comparison with too many items', () => {
		const items = Array.from(
			{ length: LIMITS.MAX_COMPARISON_ITEMS + 2 },
			(_, i) => `{name:"n${i}",attributes:["a"]}`
		).join(',');
		const content = `root = Comparison("c", [${items}])`;
		expect(parseIntelligentUI({ version: '1', content }).ok).toBe(false);
	});

	it('rejects a string exceeding the length limit', () => {
		const content = `root = Metric("${'x'.repeat(LIMITS.MAX_STRING_LENGTH + 10)}", "v")`;
		expect(parseIntelligentUI({ version: '1', content }).ok).toBe(false);
	});
});

describe('intelligent-ui adapter — engine abstraction', () => {
	it('can parse via the json-render engine (fallback)', () => {
		const spec = JSON.stringify({
			root: 'r',
			elements: { r: { type: 'Metric', props: { label: 'L', value: 'V' } } }
		});
		const out = parseIntelligentUI({ content: spec }, 'json-render');
		expect(out.ok).toBe(true);
		if (out.ok) {
			expect(out.engine).toBe('json-render');
			expect(out.node.type).toBe('metric');
		}
	});

	it('never emits HTML/JS-bearing structures', () => {
		const out = parseIntelligentUI({ version: '1', content: fixture('metric-valid.txt') });
		expect(out.ok).toBe(true);
		const json = JSON.stringify(out);
		expect(json).not.toContain('<script');
		expect(json).not.toContain('onerror=');
		expect(json).not.toContain('javascript:');
	});
});
