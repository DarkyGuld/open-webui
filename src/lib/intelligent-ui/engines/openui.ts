/**
 * Primary engine: OpenUI Lang via `@openuidev/lang-core`.
 *
 * We use lang-core ONLY for parsing/language semantics. Rendering is our own
 * native Svelte layer. We deliberately do NOT depend on `@openuidev/svelte-lang`
 * (it trails the current OpenUI Lang).
 *
 * OpenUI APIs used:
 *   - defineComponent({ name, description, props: z.object(...), component })
 *   - createLibrary({ components }) -> library.toJSONSchema()
 *   - createParser(schema) -> parser.parse(text) -> { root: ElementNode | null, meta }
 *
 * `component` is an opaque placeholder — lang-core never inspects it; we map by
 * `typeName` ourselves.
 */
import { createLibrary, createParser, defineComponent } from '@openuidev/lang-core';
import { catalogComponents } from '../catalog';
import type { IntelligentUIEngine, UINode } from '../types';

// Component definitions come from the shared catalog (single source of truth).
const placeholder = { component: 'intelligent-ui' };
const def = (name: 'Metric' | 'Comparison' | 'Table') =>
	defineComponent({
		name,
		description: catalogComponents[name].description,
		props: catalogComponents[name].props,
		...placeholder
	});

const MetricDef = def('Metric');
const ComparisonDef = def('Comparison');
const TableDef = def('Table');

export const openuiLibrary = createLibrary({
	components: [MetricDef, ComparisonDef, TableDef]
});

const parser = createParser(openuiLibrary.toJSONSchema());

function mapRoot(root: { typeName: string; props: Record<string, any> }): UINode {
	const p = root.props ?? {};
	switch (root.typeName) {
		case 'Metric':
			return {
				type: 'metric',
				label: String(p.label),
				value: String(p.value),
				...(p.description != null ? { description: String(p.description) } : {}),
				...(p.action != null ? { action: p.action } : {})
			};
		case 'Comparison':
			return {
				type: 'comparison',
				...(p.title != null ? { title: String(p.title) } : {}),
				items: (p.items ?? []).map((i: any) => ({
					name: String(i.name),
					attributes: (i.attributes ?? []).map(String)
				})),
				...(p.selectable != null ? { selectable: Boolean(p.selectable) } : {}),
				...(p.action != null ? { action: p.action } : {})
			};
		case 'Table':
			return {
				type: 'table',
				...(p.title != null ? { title: String(p.title) } : {}),
				columns: (p.columns ?? []).map(String),
				rows: (p.rows ?? []).map((r: any[]) => r.map(String)),
				...(p.action != null ? { action: p.action } : {})
			};
		default:
			throw new Error(`unknown component: ${root.typeName}`);
	}
}

export const openuiEngine: IntelligentUIEngine = {
	id: 'openui',
	parse(content: string): UINode {
		const result = parser.parse(content);
		if (!result.root) throw new Error('no root component');
		if (result.meta?.errors?.length) {
			throw new Error(
				'validation: ' + result.meta.errors.map((e) => `${e.code}:${e.component}`).join(',')
			);
		}
		return mapRoot(result.root as { typeName: string; props: Record<string, any> });
	}
};
