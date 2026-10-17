import { describe, it, expect } from 'vitest';
import { parseIntelligentUI } from '../adapter';
import { validateNode, validateOutputItem } from '../validation';
import { toneSchema, TONE_VALUES } from '../tone';

describe('M9.10 — Metric tone contract', () => {
	it('Metric without tone is valid', () => {
		const out = parseIntelligentUI({
			version: '1',
			content: 'root = Metric("Monthly cost", "12 990 kr")'
		});
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'metric') expect(out.node.tone).toBeUndefined();
	});

	it('Metric with a positive tone (4th positional arg) is valid', () => {
		const out = parseIntelligentUI({
			version: '1',
			content: 'root = Metric("Monthly cost", "12 990 kr", "Most popular", "positive")'
		});
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'metric') expect(out.node.tone).toBe('positive');
	});

	it('Metric with a warning tone is valid', () => {
		const out = parseIntelligentUI({
			version: '1',
			content: 'root = Metric("Churn", "8.4%", "", "warning")'
		});
		expect(out.ok).toBe(true);
		if (out.ok && out.node.type === 'metric') expect(out.node.tone).toBe('warning');
	});

	it('rejects an unknown Metric tone', () => {
		const out = parseIntelligentUI({
			version: '1',
			content: 'root = Metric("Cost", "10 kr", "", "loud")'
		});
		expect(out.ok).toBe(false);
	});

	it('rejects a malformed positional arg in the tone slot', () => {
		const out = parseIntelligentUI({
			version: '1',
			content: 'root = Metric("Cost", "10 kr", "", {type:"send_prompt", prompt:"hi"})'
		});
		expect(out.ok).toBe(false);
	});

	it('Badge and Metric share the same tone vocabulary', () => {
		expect(toneSchema.safeParse('positive').success).toBe(true);
		expect(toneSchema.safeParse('bogus').success).toBe(false);
		expect([...TONE_VALUES]).toEqual(['neutral', 'positive', 'warning', 'negative']);
		for (const t of TONE_VALUES) {
			expect(validateNode({ type: 'metric', label: 'x', value: '1', tone: t }).ok).toBe(true);
			expect(validateNode({ type: 'badge', label: 'x', tone: t }).ok).toBe(true);
		}
	});

	it('existing Metric usage (label/value/description) still validates', () => {
		expect(validateNode({ type: 'metric', label: 'Cost', value: '5 294 kr', description: 'Incl. VAT' }).ok).toBe(true);
		expect(validateNode({ type: 'metric', label: '', value: '1' }).ok).toBe(false);
	});

	it('catalog v4 persisted output still validates (no migration)', () => {
		const item = {
			type: 'intelligent_ui',
			output_schema_version: 1,
			catalog_version: 4,
			id: 'iu_old',
			format: 'openui-lang',
			content: 'root = Metric("Total", "980 kr")'
		};
		expect(validateOutputItem(item).ok).toBe(true);
	});

	it('an old (tone-less) persisted Metric program still parses', () => {
		const out = parseIntelligentUI({ version: '1', content: 'root = Metric("Total", "980 kr", "Incl. VAT")' });
		expect(out.ok).toBe(true);
	});
});
