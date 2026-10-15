import { z } from 'zod';
import { actionSchema } from './action-schema';
import { CATALOG_VERSION, LIMITS, SUPPORTED_VERSION } from './limits';

const str = () => z.string().min(1).max(LIMITS.MAX_STRING_LENGTH);

export const metricSchema = z
	.object({
		type: z.literal('metric'),
		label: str(),
		value: str(),
		description: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		action: actionSchema.optional()
	})
	.strict();

export const comparisonItemSchema = z
	.object({
		name: str(),
		attributes: z.array(z.string().max(LIMITS.MAX_STRING_LENGTH)).max(LIMITS.MAX_COMPARISON_ATTRIBUTES)
	})
	.strict();

export const comparisonSchema = z
	.object({
		type: z.literal('comparison'),
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		items: z.array(comparisonItemSchema).min(1).max(LIMITS.MAX_COMPARISON_ITEMS),
		selectable: z.boolean().optional(),
		action: actionSchema.optional()
	})
	.strict();

export const tableSchema = z
	.object({
		type: z.literal('table'),
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		columns: z.array(z.string().max(LIMITS.MAX_STRING_LENGTH)).min(1).max(LIMITS.MAX_TABLE_COLUMNS),
		rows: z
			.array(z.array(z.string().max(LIMITS.MAX_STRING_LENGTH)).max(LIMITS.MAX_TABLE_COLUMNS))
			.max(LIMITS.MAX_TABLE_ROWS),
		action: actionSchema.optional()
	})
	.strict();

export const badgeSchema = z
	.object({ type: z.literal('badge'), label: str(), action: actionSchema.optional() })
	.strict();

export const dividerSchema = z.object({ type: z.literal('divider') }).strict();

const binding = () => z.string().max(120).optional();

export const sliderSchema = z
	.object({
		type: z.literal('slider'),
		label: str(),
		value: z.number(),
		min: z.number(),
		max: z.number(),
		step: z.number().optional(),
		binding: binding()
	})
	.strict();

export const selectSchema = z
	.object({
		type: z.literal('select'),
		label: str(),
		value: z.string().max(LIMITS.MAX_STRING_LENGTH),
		options: z.array(z.string().max(LIMITS.MAX_STRING_LENGTH)).min(1).max(LIMITS.MAX_CHILDREN),
		binding: binding()
	})
	.strict();

export const switchSchema = z
	.object({ type: z.literal('switch'), label: str(), value: z.boolean(), binding: binding() })
	.strict();

export const checkboxSchema = z
	.object({ type: z.literal('checkbox'), label: str(), value: z.boolean(), binding: binding() })
	.strict();

export const inputSchema = z
	.object({
		type: z.literal('input'),
		label: str(),
		value: z.string().max(LIMITS.MAX_STRING_LENGTH),
		placeholder: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		binding: binding()
	})
	.strict();

// Recursive container schema (children are nodes).
export const containerSchema: z.ZodTypeAny = z.lazy(() =>
	z
		.object({
			type: z.enum(['stack', 'row', 'grid', 'section', 'card']),
			title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
			children: z.array(uiNodeSchema).max(LIMITS.MAX_CHILDREN),
			action: actionSchema.optional()
		})
		.strict()
);

export const uiNodeSchema: z.ZodTypeAny = z.lazy(() =>
	z.union([
		metricSchema,
		comparisonSchema,
		tableSchema,
		badgeSchema,
		dividerSchema,
		sliderSchema,
		selectSchema,
		switchSchema,
		checkboxSchema,
		inputSchema,
		containerSchema
	])
);

/** Optional JSON envelope form (forward-compatible with the internal envelope). */
export const envelopeSchema = z
	.object({
		version: z.number().int(),
		catalog_version: z.number().int().optional(),
		catalogVersion: z.number().int().optional(),
		content: z.string()
	})
	.passthrough();

export const SUPPORTED = { version: SUPPORTED_VERSION, catalogVersion: CATALOG_VERSION } as const;

/** Durable structured output item (message.output[]). */
export const outputItemSchema = z
	.object({
		type: z.literal('intelligent_ui'),
		output_schema_version: z.number().int(),
		catalog_version: z.number().int(),
		id: z.string().min(1).max(128),
		format: z.enum(['openui-lang', 'json']),
		content: z.string().max(LIMITS.MAX_PAYLOAD_BYTES),
		state: z.record(z.string(), z.unknown()).optional(),
		fallback_markdown: z.string().max(LIMITS.MAX_PAYLOAD_BYTES).optional()
	})
	.strict();
