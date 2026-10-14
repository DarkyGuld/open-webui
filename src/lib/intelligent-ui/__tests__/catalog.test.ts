import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { catalogComponentNames, catalogComponents } from '../catalog';
import { SUPPORTED_COMPONENTS } from '../registry';

const promptFile = fileURLToPath(
	new URL('../../../../backend/open_webui/intelligent_ui/catalog_prompt.py', import.meta.url)
);

describe('intelligent-ui catalog — single source of truth', () => {
	it('defines exactly the three supported components', () => {
		expect([...catalogComponentNames].sort()).toEqual(['Comparison', 'Metric', 'Table']);
	});

	it('catalog component types match the frontend registry', () => {
		const catalogTypes = catalogComponentNames.map((n) => catalogComponents[n].type).sort();
		expect(catalogTypes).toEqual([...SUPPORTED_COMPONENTS].sort());
	});

	it('generated server prompt is in sync with the catalog', () => {
		const prompt = readFileSync(promptFile, 'utf8');
		expect(prompt).toContain('catalog_version: 1');
		expect(prompt).toContain('CATALOG_VERSION = 1');
		// every catalog component must appear in the generated prompt
		for (const name of catalogComponentNames) {
			expect(prompt).toContain(name);
		}
		// transport fence instruction must be present
		expect(prompt).toContain(':::intelligent-ui');
	});
});
