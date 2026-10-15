/**
 * Allow-listed, typed component actions. No arbitrary callbacks or code.
 * Shared by the catalog (model contract) and the node schema (validation).
 * Risk levels live in actions.ts.
 */
import { z } from 'zod';
import { LIMITS } from './limits';

export const actionSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('send_prompt'),
		prompt: z.string().min(1).max(LIMITS.MAX_ACTION_PROMPT_LENGTH)
	}),
	z.object({ type: z.literal('select'), value: z.string().max(LIMITS.MAX_STRING_LENGTH) }),
	z.object({ type: z.literal('toggle'), value: z.boolean() }),
	z.object({
		type: z.literal('set_value'),
		value: z.union([z.string().max(500), z.number(), z.boolean()])
	}),
	z.object({ type: z.literal('confirm'), prompt: z.string().max(LIMITS.MAX_ACTION_PROMPT_LENGTH).optional() })
]);
