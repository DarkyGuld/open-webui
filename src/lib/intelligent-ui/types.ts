/**
 * Intelligent UI — canonical types.
 *
 * The rest of Open WebUI interacts with the adapter (`adapter.ts`), never with a
 * specific engine package. Persisted messages carry only a versioned token +
 * engine-agnostic content; the engine is selected internally (system-controlled).
 */

export type IntelligentUIEngineId = 'openui' | 'json-render';

/** Allow-listed component actions (no arbitrary callbacks or code). */
export type UIAction =
	| { type: 'send_prompt'; prompt: string }
	| { type: 'select'; value: string }
	| { type: 'toggle'; value: boolean }
	| { type: 'set_value'; value: string | number | boolean }
	| { type: 'confirm'; prompt?: string };

// --- Leaf nodes ---

export interface MetricNode {
	type: 'metric';
	label: string;
	value: string;
	description?: string;
	action?: UIAction;
}

export interface ComparisonItem {
	name: string;
	attributes: string[];
}

export interface ComparisonNode {
	type: 'comparison';
	title?: string;
	items: ComparisonItem[];
	selectable?: boolean;
	action?: UIAction;
}

export interface TableNode {
	type: 'table';
	title?: string;
	columns: string[];
	rows: string[][];
	action?: UIAction;
}

export interface BadgeNode {
	type: 'badge';
	label: string;
	action?: UIAction;
}

export interface DividerNode {
	type: 'divider';
}

// --- Container nodes (recursive layout composition) ---

// --- Input nodes (reactive, two-way bound to $state) ---

export interface SliderNode {
	type: 'slider';
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	binding?: string;
}

export interface SelectNode {
	type: 'select';
	label: string;
	value: string;
	options: string[];
	binding?: string;
}

export interface SwitchNode {
	type: 'switch';
	label: string;
	value: boolean;
	binding?: string;
}

export interface CheckboxNode {
	type: 'checkbox';
	label: string;
	value: boolean;
	binding?: string;
}

export interface InputNode {
	type: 'input';
	label: string;
	value: string;
	placeholder?: string;
	binding?: string;
}

export type ContainerType = 'stack' | 'row' | 'grid' | 'section' | 'card';

export interface ContainerNode {
	type: ContainerType;
	title?: string;
	children: UINode[];
	action?: UIAction;
}

export type InputNodeType = 'slider' | 'select' | 'switch' | 'checkbox' | 'input';

export type UINode =
	| MetricNode
	| ComparisonNode
	| TableNode
	| BadgeNode
	| DividerNode
	| SliderNode
	| SelectNode
	| SwitchNode
	| CheckboxNode
	| InputNode
	| ContainerNode;
export type UINodeType = UINode['type'];

export const CONTAINER_TYPES: ContainerType[] = ['stack', 'row', 'grid', 'section', 'card'];

/** Stable internal envelope (constructed by the adapter; engine is system-chosen). */
export interface IntelligentUIEnvelope {
	version: number;
	catalogVersion: number;
	engine: IntelligentUIEngineId;
	content: string;
}

export type ParseOutcome =
	| { ok: true; node: UINode; engine: IntelligentUIEngineId }
	| { ok: false; reason: string; engine?: IntelligentUIEngineId };

export interface IntelligentUIEngine {
	id: IntelligentUIEngineId;
	parse(content: string): UINode;
}

export interface IntelligentUIToken {
	fenceType: string;
	attributes?: Record<string, string>;
	text: string;
}

/**
 * Durable structured output item (message.output[]). Versioned independently of
 * the catalog. The engine format is recorded so the item schema stays
 * engine-agnostic; canonical parsing remains client-side (adapter).
 */
export interface IntelligentUIOutputItem {
	type: 'intelligent_ui';
	output_schema_version: number;
	catalog_version: number;
	id: string;
	format: 'openui-lang' | 'json';
	content: string;
	state?: Record<string, unknown>;
}
