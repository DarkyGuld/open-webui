/**
 * Primary engine: OpenUI Lang via `@openuidev/lang-core`.
 *
 * We use lang-core for parsing AND runtime evaluation (state, expressions,
 * ternary, two-way binding). Rendering is our own native Svelte layer. We do
 * NOT depend on `@openuidev/svelte-lang` and do NOT build a parallel engine.
 *
 * OpenUI APIs used:
 *   - createLibrary / defineComponent / markReactive / `.ref`   [catalog.ts]
 *   - library.toJSONSchema(), createParser(schema)
 *   - createStore(), store.initialize(stateDeclarations, {})
 *   - evaluateElementProps(el, { ctx, library, store })
 *   - isReactiveAssign(value) -> two-way binding descriptor
 */
import {
	createParser,
	createStreamingParser,
	createStore,
	evaluate,
	evaluateElementProps,
	isReactiveAssign
} from '@openuidev/lang-core';
import type { ElementNode, Store } from '@openuidev/lang-core';
import { COMPONENT_TYPE_MAP, openuiLibrary } from '../catalog';
import type { IntelligentUIEngine, UINode } from '../types';

const parser = createParser(openuiLibrary.toJSONSchema());

/**
 * `@Each` expands to a nested ARRAY of ElementNodes inside `children`; flatten
 * (recursively) and drop anything that is not an element node.
 */
function flattenChildren(children: any): any[] {
	const out: any[] = [];
	for (const child of Array.isArray(children) ? children : []) {
		if (Array.isArray(child)) out.push(...flattenChildren(child));
		else if (child && child.type === 'element') out.push(child);
	}
	return out;
}

/**
 * Normalize a lang-core ActionStep (or ActionPlan / array) into our safe,
 * serializable OpenUIAction. Only allow-listed step types survive; anything
 * else (e.g. `@Run`) is dropped.
 */
function normalizeAction(action: any, store: Store | null): unknown {
	if (!action) return undefined;
	const steps = Array.isArray(action) ? action : action.steps ? action.steps : [action];
	const ctx = {
		getState: (n: string) => (store ? store.get(n) : undefined),
		resolveRef: (n: string) => (store ? store.get(n) : undefined)
	};
	const out: any[] = [];
	for (const s of steps) {
		if (!s || typeof s !== 'object') continue;
		if (s.type === 'set') {
			let value: unknown;
			try {
				value = evaluate(s.valueAST, ctx as any);
			} catch {
				value = undefined;
			}
			out.push({ type: 'set', target: String(s.target), value });
		} else if (s.type === 'reset') {
			out.push({ type: 'reset', targets: (s.targets ?? []).map(String) });
		} else if (s.type === 'continue_conversation') {
			out.push({ type: 'send_prompt', prompt: String(s.message) });
		} else if (s.type === 'open_url') {
			out.push({ type: 'open_url', url: String(s.url) });
		}
		// 'run' (query/mutation) handled in the query phase; dropped here.
	}
	if (!out.length) return undefined;
	return out.length === 1 ? out[0] : out;
}

function bound(value: unknown, store: Store | null): { value: unknown; binding?: string } {
	if (isReactiveAssign(value)) {
		return { value: store ? store.get(value.target) : undefined, binding: value.target };
	}
	return { value };
}

function mapNode(element: ElementNode, store: Store | null): UINode {
	const type = COMPONENT_TYPE_MAP[element.typeName];
	if (!type) throw new Error(`unknown component: ${element.typeName}`);
	const p = (element.props ?? {}) as Record<string, any>;

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
		case 'button': {
			const action = normalizeAction(p.action, store);
			return { type: 'button', label: String(p.label), ...(action ? { action } : {}) };
		}
		case 'slider': {
			const b = bound(p.value, store);
			return {
				type: 'slider',
				label: String(p.label),
				min: Number(p.min),
				max: Number(p.max),
				...(p.step != null ? { step: Number(p.step) } : {}),
				value: Number(b.value ?? p.min ?? 0),
				...(b.binding ? { binding: b.binding } : {})
			};
		}
		case 'select': {
			const b = bound(p.value, store);
			return {
				type: 'select',
				label: String(p.label),
				options: (p.options ?? []).map(String),
				value: String(b.value ?? ''),
				...(b.binding ? { binding: b.binding } : {})
			};
		}
		case 'switch': {
			const b = bound(p.value, store);
			return {
				type: 'switch',
				label: String(p.label),
				value: Boolean(b.value),
				...(b.binding ? { binding: b.binding } : {})
			};
		}
		case 'checkbox': {
			const b = bound(p.value, store);
			return {
				type: 'checkbox',
				label: String(p.label),
				value: Boolean(b.value),
				...(b.binding ? { binding: b.binding } : {})
			};
		}
		case 'input': {
			const b = bound(p.value, store);
			return {
				type: 'input',
				label: String(p.label),
				value: String(b.value ?? ''),
				...(p.placeholder != null ? { placeholder: String(p.placeholder) } : {}),
				...(b.binding ? { binding: b.binding } : {})
			};
		}
		case 'stack':
		case 'row':
		case 'grid':
		case 'section':
		case 'card':
			return {
				type: type as 'stack' | 'row' | 'grid' | 'section' | 'card',
				...(p.title != null ? { title: String(p.title) } : {}),
				children: flattenChildren(p.children).map((c: any) => mapNode(c, store)),
				...(p.action != null ? { action: p.action } : {})
			};
		default:
			throw new Error(`unsupported component: ${element.typeName}`);
	}
}

export interface OpenUIRuntime {
	store: Store;
	state: Record<string, unknown>;
	evaluate(): UINode;
	resetState(names: string[]): void;
}

export function createOpenUIRuntime(content: string): OpenUIRuntime {
	const result = parser.parse(content);
	if (!result.root) throw new Error('no root component');
	if (result.meta?.errors?.length) {
		throw new Error(
			'validation: ' + result.meta.errors.map((e) => `${e.code}:${e.component}`).join(',')
		);
	}

	const store = createStore();
	const state = (result.stateDeclarations ?? {}) as Record<string, unknown>;
	store.initialize(state, {});

	const evalCtx = {
		ctx: {
			getState: (name: string) => store.get(name),
			resolveRef: (name: string) => store.get(name)
		},
		library: openuiLibrary,
		store,
		errors: [] as any[]
	};

	const root = result.root;
	const evaluate = (): UINode => {
		const evaluated = evaluateElementProps(root, evalCtx as any);
		return mapNode(evaluated, store);
	};

	const resetState = (names: string[]): void => {
		for (const name of names ?? []) store.set(name, name in state ? state[name] : null);
	};

	return { store, state, evaluate, resetState };
}

export const openuiEngine: IntelligentUIEngine = {
	id: 'openui',
	parse(content: string): UINode {
		return createOpenUIRuntime(content).evaluate();
	}
};

/**
 * Parse a possibly-incomplete program for progressive rendering (streaming).
 * Uses lang-core's streaming parser (statement cache, partial-safe). Returns
 * null when nothing renderable exists yet; throws only on a genuine error in a
 * COMPLETE program. Mid-stream "missing-required" noise is ignored while
 * `incomplete`.
 */
export function parseOpenUIPartial(content: string): UINode | null {
	const sp = createStreamingParser(openuiLibrary.toJSONSchema());
	const result = sp.push(content);
	if (!result.root) return null;
	if (!result.meta?.incomplete && result.meta?.errors?.length) {
		throw new Error(
			'validation: ' + result.meta.errors.map((e) => `${e.code}:${e.component}`).join(',')
		);
	}

	const store = createStore();
	const state = (result.stateDeclarations ?? {}) as Record<string, unknown>;
	store.initialize(state, {});
	const evalCtx = {
		ctx: {
			getState: (name: string) => store.get(name),
			resolveRef: (name: string) => store.get(name)
		},
		library: openuiLibrary,
		store,
		errors: [] as any[]
	};
	const evaluated = evaluateElementProps(result.root, evalCtx as any);
	return mapNode(evaluated, store);
}
