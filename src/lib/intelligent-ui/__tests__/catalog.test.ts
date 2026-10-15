import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { catalogComponentNames, COMPONENT_TYPE_MAP } from '../catalog';
import { SUPPORTED_COMPONENTS } from '../registry';

const promptFile = fileURLToPath(
	new URL('../../../../backend/open_webui/intelligent_ui/catalog_prompt.py', import.meta.url)
);

describe('intelligent-ui catalog — single source of truth', () => {
	it('exposes the full component set', () => {
		expect([...catalogComponentNames].sort()).toEqual([
			'Badge',
			'Button',
			'Card',
			'Chart',
			'Checkbox',
			'Comparison',
			'Data',
			'Divider',
			'Field',
			'Form',
			'Gallery',
			'Grid',
			'Input',
			'Metric',
			'Progress',
			'Radio',
			'Row',
			'Section',
			'Select',
			'Slider',
			'Stack',
			'Switch',
			'Tab',
			'Table',
			'Tabs',
			'Textarea',
			'Timeline'
		]);
	});

	it('catalog component types match the frontend registry', () => {
		const catalogTypes = catalogComponentNames.map((n) => COMPONENT_TYPE_MAP[n]).sort();
		expect(catalogTypes).toEqual([...SUPPORTED_COMPONENTS].sort());
	});

	it('generated server prompt is in sync with the catalog', () => {
		const prompt = readFileSync(promptFile, 'utf8');
		expect(prompt).toContain('catalog_version: 4');
		expect(prompt).toContain('CATALOG_VERSION = 4');
		for (const name of catalogComponentNames) {
			expect(prompt).toContain(name);
		}
		expect(prompt).toContain(':::intelligent-ui');
	});
});
