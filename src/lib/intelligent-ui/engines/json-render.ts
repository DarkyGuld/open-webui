/**
 * Fallback engine: json-render.
 *
 * Preserved as an engine abstraction so the adapter can be swapped without
 * touching chat rendering or component code. It is NOT executed on the normal
 * path (only `openui` runs by default).
 *
 * This implementation maps the json-render flat spec shape
 * (`{ root, elements: { [id]: { type, props } } }`) — or a plain `{ type, ...props }`
 * object — into canonical nodes. It can later be backed by `@json-render/core`
 * without changing the adapter interface.
 */
import type { IntelligentUIEngine, UINode } from '../types';

function toNode(el: { type?: string; props?: Record<string, any> }): UINode {
	const p = el.props ?? {};
	switch (String(el.type ?? '').toLowerCase()) {
		case 'metric':
			return {
				type: 'metric',
				label: String(p.label),
				value: String(p.value),
				...(p.description != null ? { description: String(p.description) } : {})
			};
		case 'comparison':
			return {
				type: 'comparison',
				...(p.title != null ? { title: String(p.title) } : {}),
				items: (p.items ?? []).map((i: any) => ({
					name: String(i.name),
					attributes: (i.attributes ?? []).map(String)
				}))
			};
		case 'table':
			return {
				type: 'table',
				...(p.title != null ? { title: String(p.title) } : {}),
				columns: (p.columns ?? []).map(String),
				rows: (p.rows ?? []).map((r: any[]) => r.map(String))
			};
		default:
			throw new Error(`unknown component: ${el.type}`);
	}
}

export const jsonRenderEngine: IntelligentUIEngine = {
	id: 'json-render',
	parse(content: string): UINode {
		const spec = JSON.parse(content);
		const el =
			spec && spec.elements && spec.root ? spec.elements[spec.root] : spec;
		if (!el || typeof el !== 'object') throw new Error('invalid json-render spec');
		return toNode(el);
	}
};
