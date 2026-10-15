/**
 * Intelligent UI adapter — the single boundary between Open WebUI and any
 * generative-UI engine. Nothing else in the app imports an engine package.
 *
 * Two entry points:
 *   - parseIntelligentUI(): static parse + validate (no runtime handle).
 *   - createIntelligentUIRuntime(): parse + a live state runtime (store) for
 *     two-way binding (OpenUI engine only; json-render stays static).
 */
import { envelopeSchema } from './schema';
import { SUPPORTED_VERSION } from './limits';
import { isPayloadWithinLimits, validateNode } from './validation';
import { createOpenUIRuntime, openuiEngine } from './engines/openui';
import { jsonRenderEngine } from './engines/json-render';
import type { IntelligentUIEngine, IntelligentUIEngineId, ParseOutcome, UINode } from './types';

/** Engine is system-controlled — never selected by the model or the payload. */
export const DEFAULT_ENGINE: IntelligentUIEngineId = 'openui';

const ENGINES: Record<IntelligentUIEngineId, IntelligentUIEngine> = {
	openui: openuiEngine,
	'json-render': jsonRenderEngine
};

export interface ParseInput {
	/** Value of the `v` attribute on the token (transport/envelope version). */
	version?: string | number | null;
	/** Raw token content (engine payload, or an optional JSON envelope). */
	content: string;
}

type ResolvedPayload = { ok: true; version: number; payload: string } | { ok: false; reason: string };

function resolvePayload(input: ParseInput): ResolvedPayload {
	const raw = input.content ?? '';
	if (!isPayloadWithinLimits(raw)) return { ok: false, reason: 'payload exceeds size limit' };

	let version = Number.parseInt(String(input.version ?? SUPPORTED_VERSION), 10);
	let payload = raw;

	const trimmed = raw.trim();
	if (trimmed.startsWith('{')) {
		try {
			const env = envelopeSchema.parse(JSON.parse(trimmed));
			version = env.version;
			payload = env.content;
		} catch {
			// Not an envelope — treat as a raw engine payload.
		}
	}

	if (version !== SUPPORTED_VERSION) {
		return { ok: false, reason: `unsupported version ${version}` };
	}
	return { ok: true, version, payload };
}

export function parseIntelligentUI(
	input: ParseInput,
	engineId: IntelligentUIEngineId = DEFAULT_ENGINE
): ParseOutcome {
	const resolved = resolvePayload(input);
	if (!resolved.ok) return { ok: false, reason: resolved.reason };

	const engine = ENGINES[engineId] ?? openuiEngine;
	let node: unknown;
	try {
		node = engine.parse(resolved.payload);
	} catch (error) {
		return { ok: false, reason: `parse error: ${(error as Error).message}`, engine: engineId };
	}
	const validated = validateNode(node);
	if (!validated.ok) {
		return { ok: false, reason: `validation: ${validated.reason}`, engine: engineId };
	}
	return { ok: true, node: validated.node, engine: engineId };
}

/** Live runtime handle for two-way binding (OpenUI engine). */
export interface IntelligentUIRuntime {
	getState(): Record<string, unknown>;
	setState(name: string, value: unknown): void;
	subscribe(cb: () => void): () => void;
	evaluate(): UINode;
}

export type RuntimeOutcome =
	| { ok: true; node: UINode; engine: IntelligentUIEngineId; runtime?: IntelligentUIRuntime }
	| { ok: false; reason: string; engine?: IntelligentUIEngineId };

export function createIntelligentUIRuntime(
	input: ParseInput,
	engineId: IntelligentUIEngineId = DEFAULT_ENGINE
): RuntimeOutcome {
	const resolved = resolvePayload(input);
	if (!resolved.ok) return { ok: false, reason: resolved.reason };

	if (engineId === 'openui') {
		try {
			const rt = createOpenUIRuntime(resolved.payload);
			const node = rt.evaluate();
			const validated = validateNode(node);
			if (!validated.ok) {
				return { ok: false, reason: `validation: ${validated.reason}`, engine: engineId };
			}
			return {
				ok: true,
				node: validated.node,
				engine: engineId,
				runtime: {
					getState: () => rt.store.getSnapshot(),
					setState: (name, value) => rt.store.set(name, value),
					subscribe: (cb) => rt.store.subscribe(cb),
					evaluate: () => rt.evaluate()
				}
			};
		} catch (error) {
			return { ok: false, reason: `parse error: ${(error as Error).message}`, engine: engineId };
		}
	}

	const out = parseIntelligentUI(input, engineId);
	return out.ok
		? { ok: true, node: out.node, engine: engineId }
		: { ok: false, reason: out.reason, engine: engineId };
}
