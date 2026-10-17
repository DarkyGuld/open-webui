/** Privacy-safe first persistence slice. No server writes or model context.
 * Scope: user + chat + block + SHA-256 of program (edits/regeneration reset).
 * Only explicit control bindings survive: bounded sliders, booleans and
 * enumerated selections. Input/Textarea and arbitrary runtime variables do not.
 */
import { LIMITS } from './limits';
import type { UINode } from './types';

const PREFIX = 'intelligent-ui-controls-v1:';
const MAX_ENTRIES = 32;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
export interface InteractionScope { key: string }

export async function createInteractionScope(
	userId: string, chatId: string, blockId: string, program: string
): Promise<InteractionScope | null> {
	if (!userId || !chatId || !blockId) return null;
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(program));
	const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
	return { key: PREFIX + JSON.stringify([userId, chatId, blockId, hash]) };
}

/** Revalidate saved values against the CURRENT validated node tree on both
 * save and restore. Storage is untrusted; stale/unknown values are ignored. */
export function safeControlValues(node: UINode, values: Record<string, unknown>): Record<string, unknown> {
	const safe: Record<string, unknown> = {};
	function walk(n: UINode) {
		if (n.type === 'comparison' && n.selectable && typeof values._selection === 'string' &&
			n.items.some((i) => i.name === values._selection)) safe._selection = values._selection;
		if ('binding' in n && n.binding && Object.hasOwn(values, n.binding)) {
			const value = values[n.binding];
			if (n.type === 'slider' && typeof value === 'number' && Number.isFinite(value) && value >= n.min && value <= n.max)
				safe[n.binding] = value;
			if ((n.type === 'switch' || n.type === 'checkbox') && typeof value === 'boolean') safe[n.binding] = value;
			if ((n.type === 'select' || n.type === 'radio') && typeof value === 'string' && value.length <= 120 && n.options.includes(value))
				safe[n.binding] = value;
		}
		if ('children' in n) n.children.forEach(walk);
	}
	walk(node);
	return safe;
}

export function loadControlState(scope: InteractionScope, node: UINode): Record<string, unknown> {
	try {
		const raw = localStorage.getItem(scope.key);
		if (!raw || new TextEncoder().encode(raw).length > LIMITS.MAX_STATE_BYTES) return {};
		const entry = JSON.parse(raw);
		if (!Number.isFinite(entry.at) || entry.at > Date.now() || Date.now() - entry.at > TTL_MS ||
			!entry.values || typeof entry.values !== 'object' || Array.isArray(entry.values)) return {};
		return safeControlValues(node, entry.values);
	} catch { return {}; }
}

export function saveControlState(scope: InteractionScope, node: UINode, values: Record<string, unknown>): void {
	try {
		const entry = { at: Date.now(), values: safeControlValues(node, values) };
		const raw = JSON.stringify(entry);
		if (new TextEncoder().encode(raw).length > LIMITS.MAX_STATE_BYTES) return;
		localStorage.setItem(scope.key, raw);
		// Bound this namespace only; never evict unrelated application storage.
		const keys: { key: string; at: number }[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (!key?.startsWith(PREFIX)) continue;
			let at = 0;
			try { at = JSON.parse(localStorage.getItem(key) ?? '{}').at ?? 0; } catch { /* evict corrupt entries */ }
			keys.push({ key, at });
		}
		keys.sort((a, b) => b.at - a.at || Number(b.key === scope.key) - Number(a.key === scope.key));
		for (const old of keys.slice(MAX_ENTRIES)) localStorage.removeItem(old.key);
	} catch { /* quota/disabled storage: interactions still work in memory */ }
}
