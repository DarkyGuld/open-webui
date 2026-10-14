/**
 * Intelligent UI — canonical types.
 *
 * The rest of Open WebUI interacts with the adapter (`adapter.ts`), never with a
 * specific engine package. Persisted messages carry only a versioned token +
 * engine-agnostic content; the engine is selected internally (system-controlled).
 */

export type IntelligentUIEngineId = 'openui' | 'json-render';

/** Canonical, validated render nodes (Milestone 2 allow-list: exactly three). */
export interface MetricNode {
	type: 'metric';
	label: string;
	value: string;
	description?: string;
}

export interface ComparisonItem {
	name: string;
	attributes: string[];
}

export interface ComparisonNode {
	type: 'comparison';
	title?: string;
	items: ComparisonItem[];
}

export interface TableNode {
	type: 'table';
	title?: string;
	columns: string[];
	rows: string[][];
}

export type UINode = MetricNode | ComparisonNode | TableNode;
export type UINodeType = UINode['type'];

/**
 * Stable internal envelope. Constructed by the adapter from the token — the model
 * does not choose the engine. `content` is the engine payload (e.g. OpenUI Lang).
 */
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
	/** Parse engine payload -> canonical node. May throw on malformed input. */
	parse(content: string): UINode;
}

/** Token surface the renderer receives from the colonFence tokenizer. */
export interface IntelligentUIToken {
	fenceType: string;
	attributes?: Record<string, string>;
	text: string;
}
