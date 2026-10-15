/**
 * Durable Intelligent UI state.
 *
 * Milestone 4 persists *meaningful* interaction state (selections, toggles,
 * confirmed values) in browser storage keyed by chat + block, so it survives a
 * reload and reopening the conversation. Server-side durable state is a future
 * step (see docs/intelligent-ui/OUTPUT_PERSISTENCE.md).
 *
 * Ephemeral state (hover, transient visuals) is intentionally NOT persisted.
 */
import { LIMITS } from './limits';

const PREFIX = 'intelligent-ui-state-v1';

function key(chatId: string, blockId: string): string {
	return `${PREFIX}:${chatId || 'nochat'}:${blockId}`;
}

export type UIState = Record<string, unknown>;

export function loadState(chatId: string, blockId: string): UIState {
	try {
		const raw = localStorage.getItem(key(chatId, blockId));
		if (!raw) return {};
		if (new TextEncoder().encode(raw).length > LIMITS.MAX_STATE_BYTES) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

export function saveState(chatId: string, blockId: string, state: UIState): void {
	try {
		const raw = JSON.stringify(state);
		if (new TextEncoder().encode(raw).length > LIMITS.MAX_STATE_BYTES) return;
		localStorage.setItem(key(chatId, blockId), raw);
	} catch {
		/* storage unavailable — ignore */
	}
}
