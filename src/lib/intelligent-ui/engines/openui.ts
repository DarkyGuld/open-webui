/**
 * Primary engine: OpenUI Lang via `@openuidev/lang-core`.
 *
 * We use lang-core ONLY for parsing/language semantics. Rendering is our own
 * native Svelte layer. We deliberately do NOT depend on `@openuidev/svelte-lang`.
 *
 * The library/catalog lives in `catalog.ts` (single source of truth).
 *
 * OpenUI APIs used:
 *   - createLibrary / defineComponent + `.ref` (children unions)   [catalog.ts]
 *   - library.toJSONSchema()
 *   - createParser(schema) -> parser.parse(text) -> { root: ElementNode | null, meta }
 */
import { createParser } from '@openuidev/lang-core';
import { COMPONENT_TYPE_MAP, openuiLibrary } from '../catalog';
import type { IntelligentUIEngine, UINode } from '../types';

const parser = createParser(openuiLibrary.toJSONSchema());

function mapNode(element: { typeName: string; props: Record<string, any> }): UINode {
	const type = COMPONENT_TYPE_MAP[element.typeName];
	if (!type) throw new Error(`unknown component: ${element.typeName}`);
	const p = element.props ?? {};

	switch (type) {
		case 'metric':
			return {
				type: 'metric',
				label: String(p.label),
				value: String(p.value),
				...(p.description != null ? { description: String(p.description) } : {}),
				...(p.action != null ? { action: p.action } : {})
			};
		case 'comparison':
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
		case 'table':
			return {
				type: 'table',
				...(p.title != null ? { title: String(p.title) } : {}),
				columns: (p.columns ?? []).map(String),
				rows: (p.rows ?? []).map((r: any[]) => r.map(String)),
				...(p.action != null ? { action: p.action } : {})
			};
		case 'badge':
			return { type: 'badge', label: String(p.label), ...(p.action != null ? { action: p.action } : {}) };
		case 'divider':
			return { type: 'divider' };
		case 'stack':
		case 'row':
		case 'grid':
		case 'section':
		case 'card':
			return {
				type: type as 'stack' | 'row' | 'grid' | 'section' | 'card',
				...(p.title != null ? { title: String(p.title) } : {}),
				children: (p.children ?? []).map((c: any) => mapNode(c)),
				...(p.action != null ? { action: p.action } : {})
			};
		default:
			throw new Error(`unsupported component: ${element.typeName}`);
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
		return mapNode(result.root as { typeName: string; props: Record<string, any> });
	}
};
