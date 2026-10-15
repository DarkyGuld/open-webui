/**
 * Intelligent UI catalog — the SINGLE source of truth for supported components
 * AND their safe, allow-listed actions.
 *
 * Used by engines/openui.ts (parsing), schema.ts (derived validation), and
 * scripts/intelligent-ui/generate-prompt.ts (server prompt).
 *
 * Only metric, comparison, table. catalog_version = 2 (v1 nodes remain valid;
 * the interaction fields are optional/backward-compatible).
 */
import { z } from 'zod';
import { CATALOG_VERSION, LIMITS } from './limits';

export const CATALOG_VERSION_ID = CATALOG_VERSION;

const str = () => z.string().min(1).max(LIMITS.MAX_STRING_LENGTH);

/**
 * Allow-listed, typed component actions. No arbitrary callbacks or code.
 * Risk levels (see actions.ts): send_prompt/select/toggle/set_value = safe,
 * confirm = confirm. Anything else is rejected.
 */
export const actionSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('send_prompt'), prompt: str().max(LIMITS.MAX_ACTION_PROMPT_LENGTH) }),
	z.object({ type: z.literal('select'), value: z.string().max(LIMITS.MAX_STRING_LENGTH) }),
	z.object({ type: z.literal('toggle'), value: z.boolean() }),
	z.object({
		type: z.literal('set_value'),
		value: z.union([z.string().max(500), z.number(), z.boolean()])
	}),
	z.object({ type: z.literal('confirm'), prompt: z.string().max(LIMITS.MAX_ACTION_PROMPT_LENGTH).optional() })
]);

export const catalogComponents = {
	Metric: {
		type: 'metric',
		description:
			'A single important number (cost, total, count) with a short label and optional note. Use for one headline figure.',
		props: z.object({
			label: z.string().min(1).max(LIMITS.MAX_STRING_LENGTH).describe('Short label, e.g. "Monthly cost"'),
			value: z.string().min(1).max(LIMITS.MAX_STRING_LENGTH).describe('The value, e.g. "5 294 kr"'),
			description: z.string().max(LIMITS.MAX_STRING_LENGTH).optional().describe('Optional supporting note'),
			action: actionSchema.optional().describe('Optional follow-up action for the user')
		})
	},
	Comparison: {
		type: 'comparison',
		description:
			'Compare 2-4 options side by side by name, each with a list of attributes. Use when the user must choose between options.',
		props: z.object({
			title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional().describe('Optional heading'),
			items: z
				.array(
					z.object({
						name: str().describe('Option name'),
						attributes: z
							.array(z.string().max(LIMITS.MAX_STRING_LENGTH))
							.max(LIMITS.MAX_COMPARISON_ATTRIBUTES)
							.describe('Attributes for this option')
					})
				)
				.min(1)
				.max(LIMITS.MAX_COMPARISON_ITEMS)
				.describe('2-4 options'),
			selectable: z.boolean().optional().describe('Let the user select one option'),
			action: actionSchema.optional().describe('Optional follow-up action for the user')
		})
	},
	Table: {
		type: 'table',
		description:
			'A simple data table with columns and rows. Use for structured tabular data that is easier to scan than prose.',
		props: z.object({
			title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional().describe('Optional caption'),
			columns: z
				.array(z.string().max(LIMITS.MAX_STRING_LENGTH))
				.min(1)
				.max(LIMITS.MAX_TABLE_COLUMNS)
				.describe('Column headers'),
			rows: z
				.array(z.array(z.string().max(LIMITS.MAX_STRING_LENGTH)).max(LIMITS.MAX_TABLE_COLUMNS))
				.max(LIMITS.MAX_TABLE_ROWS)
				.describe('Row values (plain text)'),
			action: actionSchema.optional().describe('Optional follow-up action for the user')
		})
	}
} as const;

export const catalogComponentNames = Object.keys(catalogComponents) as (keyof typeof catalogComponents)[];
