/**
 * Intelligent UI catalog — the SINGLE source of truth for supported components.
 *
 * Used by:
 *   - engines/openui.ts        (OpenUI library for parsing)
 *   - schema.ts                (canonical node validation — derived, so no drift)
 *   - scripts/intelligent-ui/generate-prompt.ts (server-side prompt generation)
 *
 * Only metric, comparison, table are allowed (Milestone 2/3). catalog_version = 1.
 */
import { z } from 'zod';
import { CATALOG_VERSION, LIMITS } from './limits';

export const CATALOG_VERSION_ID = CATALOG_VERSION;

const str = () => z.string().min(1).max(LIMITS.MAX_STRING_LENGTH);

export const catalogComponents = {
	Metric: {
		type: 'metric',
		description:
			'A single important number (cost, total, count) with a short label and optional note. Use for one headline figure.',
		props: z.object({
			label: z.string().min(1).max(LIMITS.MAX_STRING_LENGTH).describe('Short label, e.g. "Monthly cost"'),
			value: z.string().min(1).max(LIMITS.MAX_STRING_LENGTH).describe('The value, e.g. "5 294 kr"'),
			description: z.string().max(LIMITS.MAX_STRING_LENGTH).optional().describe('Optional supporting note')
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
				.describe('2-4 options')
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
				.describe('Row values (plain text)')
		})
	}
} as const;

export const catalogComponentNames = Object.keys(catalogComponents) as (keyof typeof catalogComponents)[];
