import { uiNodeSchema } from './schema';
import { LIMITS } from './limits';
import type { UINode } from './types';

export type ValidationResult = { ok: true; node: UINode } | { ok: false; reason: string };

/** UTF-8 byte length (payload size guard). */
export function byteLength(value: string): number {
	return new TextEncoder().encode(value).length;
}

export function isPayloadWithinLimits(content: string): boolean {
	return byteLength(content) <= LIMITS.MAX_PAYLOAD_BYTES;
}

/**
 * Strictly validate a canonical node against the allow-list + Zod schemas +
 * limits. Unknown fields are rejected (`.strict()`); unknown components are
 * rejected by the discriminated union.
 */
export function validateNode(input: unknown): ValidationResult {
	const parsed = uiNodeSchema.safeParse(input);
	if (!parsed.success) {
		const reason = parsed.error.issues
			.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
			.join('; ');
		return { ok: false, reason: reason || 'schema validation failed' };
	}
	return { ok: true, node: parsed.data as UINode };
}
