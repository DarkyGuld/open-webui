/**
 * Intelligent UI adapter — the single boundary between Open WebUI and any
 * generative-UI engine. Nothing else in the app imports an engine package.
 *
 * Flow: token(version + content) -> optional envelope unwrap -> engine parse
 *       -> strict validation -> canonical node (or a safe failure reason).
 */
import { envelopeSchema } from './schema';
import { SUPPORTED_VERSION } from './limits';
import { isPayloadWithinLimits, validateNode } from './validation';
import { openuiEngine } from './engines/openui';
import { jsonRenderEngine } from './engines/json-render';
import type { IntelligentUIEngine, IntelligentUIEngineId, ParseOutcome } from './types';

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

export function parseIntelligentUI(
	input: ParseInput,
	engineId: IntelligentUIEngineId = DEFAULT_ENGINE
): ParseOutcome {
	const rawContent = input.content ?? '';
	if (!isPayloadWithinLimits(rawContent)) {
		return { ok: false, reason: 'payload exceeds size limit' };
	}

	let version = Number.parseInt(String(input.version ?? SUPPORTED_VERSION), 10);
	let payload = rawContent;

	// Optional forward-compatible JSON envelope: { version, catalog_version, content }.
	const trimmed = rawContent.trim();
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

	const engine = ENGINES[engineId] ?? openuiEngine;

	let node: unknown;
	try {
		node = engine.parse(payload);
	} catch (error) {
		return { ok: false, reason: `parse error: ${(error as Error).message}`, engine: engineId };
	}

	const validated = validateNode(node);
	if (!validated.ok) {
		return { ok: false, reason: `validation: ${validated.reason}`, engine: engineId };
	}

	return { ok: true, node: validated.node, engine: engineId };
}
