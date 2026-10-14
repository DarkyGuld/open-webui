import { z } from 'zod';
import { CATALOG_VERSION, SUPPORTED_VERSION } from './limits';
import { catalogComponents } from './catalog';

/**
 * Canonical node schemas are DERIVED from the shared catalog so the frontend
 * validation schema and the server-side catalog cannot drift.
 */
export const metricSchema = catalogComponents.Metric.props
	.extend({ type: z.literal('metric') })
	.strict();

export const comparisonSchema = catalogComponents.Comparison.props
	.extend({ type: z.literal('comparison') })
	.strict();

export const tableSchema = catalogComponents.Table.props.extend({ type: z.literal('table') }).strict();

export const uiNodeSchema = z.discriminatedUnion('type', [metricSchema, comparisonSchema, tableSchema]);

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
