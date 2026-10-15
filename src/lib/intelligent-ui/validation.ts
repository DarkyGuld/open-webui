import { outputItemSchema, uiNodeSchema } from './schema';
import { LIMITS, OUTPUT_SCHEMA_VERSION, SUPPORTED_CATALOG_VERSIONS } from './limits';
import type { IntelligentUIOutputItem, UINode } from './types';

export type ValidationResult = { ok: true; node: UINode } | { ok: false; reason: string };

/** UTF-8 byte length (payload size guard). */
export function byteLength(value: string): number {
	return new TextEncoder().encode(value).length;
}

export function isPayloadWithinLimits(content: string): boolean {
	return byteLength(content) <= LIMITS.MAX_PAYLOAD_BYTES;
}

interface TreeStats {
	nodes: number;
	depth: number;
}

function measure(node: unknown, depth = 1): TreeStats {
	if (!node || typeof node !== 'object') return { nodes: 0, depth: 0 };
	const children = Array.isArray((node as any).children) ? (node as any).children : [];
	let nodes = 1;
	let maxDepth = depth;
	for (const child of children) {
		const s = measure(child, depth + 1);
		nodes += s.nodes;
		maxDepth = Math.max(maxDepth, s.depth);
	}
	return { nodes, depth: maxDepth };
}

/**
 * Strictly validate a canonical node tree against the allow-list + Zod schemas +
 * limits. Unknown fields are rejected (`.strict()`); unknown components are
 * rejected. Enforces node-count and depth limits.
 */
export function validateNode(input: unknown): ValidationResult {
	const parsed = uiNodeSchema.safeParse(input);
	if (!parsed.success) {
		const reason = parsed.error.issues
			.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
			.slice(0, 3)
			.join('; ');
		return { ok: false, reason: reason || 'schema validation failed' };
	}
	const stats = measure(parsed.data);
	if (stats.nodes > LIMITS.MAX_NODES) {
		return { ok: false, reason: `too many nodes (${stats.nodes} > ${LIMITS.MAX_NODES})` };
	}
	if (stats.depth > LIMITS.MAX_DEPTH) {
		return { ok: false, reason: `too deep (${stats.depth} > ${LIMITS.MAX_DEPTH})` };
	}
	return { ok: true, node: parsed.data as UINode };
}

export function isSupportedCatalogVersion(version: number): boolean {
	return (SUPPORTED_CATALOG_VERSIONS as readonly number[]).includes(version);
}

export type OutputItemValidation =
	| { ok: true; item: IntelligentUIOutputItem }
	| { ok: false; reason: string };

export function validateOutputItem(input: unknown): OutputItemValidation {
	const parsed = outputItemSchema.safeParse(input);
	if (!parsed.success) return { ok: false, reason: 'invalid output item' };
	const item = parsed.data as IntelligentUIOutputItem;
	if (item.output_schema_version !== OUTPUT_SCHEMA_VERSION) {
		return { ok: false, reason: `unsupported output schema version ${item.output_schema_version}` };
	}
	if (!isSupportedCatalogVersion(item.catalog_version)) {
		return { ok: false, reason: `unsupported catalog version ${item.catalog_version}` };
	}
	return { ok: true, item };
}
