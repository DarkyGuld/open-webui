import { describe, it, expect } from 'vitest';
import { validateOutputItem, isSupportedCatalogVersion } from '../validation';

const base = {
	type: 'intelligent_ui',
	output_schema_version: 1,
	catalog_version: 2,
	id: 'iu_abc',
	format: 'openui-lang',
	content: 'root = Metric("a", "b")'
};

describe('intelligent-ui versioning', () => {
	it('accepts a valid structured output item', () => {
		expect(validateOutputItem(base).ok).toBe(true);
	});

	it('accepts catalog v1 items (backward compatibility)', () => {
		expect(validateOutputItem({ ...base, catalog_version: 1 }).ok).toBe(true);
	});

	it('rejects unknown output schema versions', () => {
		const r = validateOutputItem({ ...base, output_schema_version: 99 });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.reason).toContain('output schema');
	});

	it('rejects unsupported catalog versions (no silent interpretation)', () => {
		const r = validateOutputItem({ ...base, catalog_version: 99 });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.reason).toContain('catalog version');
	});

	it('accepts an item with fallback_markdown', () => {
		expect(validateOutputItem({ ...base, fallback_markdown: '- Monthly cost' }).ok).toBe(true);
	});

	it('rejects malformed items', () => {
		expect(validateOutputItem({ type: 'intelligent_ui' }).ok).toBe(false);
		expect(validateOutputItem(null).ok).toBe(false);
	});

	it('isSupportedCatalogVersion', () => {
		expect(isSupportedCatalogVersion(1)).toBe(true);
		expect(isSupportedCatalogVersion(2)).toBe(true);
		expect(isSupportedCatalogVersion(3)).toBe(true);
		expect(isSupportedCatalogVersion(4)).toBe(true);
		expect(isSupportedCatalogVersion(5)).toBe(false);
	});
});
