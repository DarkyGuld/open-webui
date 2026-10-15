/**
 * Intelligent UI catalog — the SINGLE source of truth for supported components.
 *
 * Built as an OpenUI library (via @openuidev/lang-core) so the model contract,
 * the system prompt, and the parser all come from one definition. The canonical
 * runtime schema (schema.ts) is a separate recursive contract kept in sync by
 * tests.
 *
 * Layout primitives (stack/row/grid/section/card) compose recursively; leaves
 * (metric/comparison/table/badge/divider) are terminals. catalog_version = 3.
 */
import { createLibrary, defineComponent } from '@openuidev/lang-core';
import { z } from 'zod';
import { actionSchema } from './action-schema';
import { CATALOG_VERSION, LIMITS } from './limits';

export const CATALOG_VERSION_ID = CATALOG_VERSION;

const str = () => z.string().min(1).max(LIMITS.MAX_STRING_LENGTH);
const placeholder = { component: 'intelligent-ui' };

// --- Leaves ---
const MetricDef = defineComponent({
	name: 'Metric',
	description: 'A single important number (cost, total, count) with a short label and optional note.',
	props: z.object({
		label: str().describe('Short label, e.g. "Monthly cost"'),
		value: str().describe('The value, e.g. "5 294 kr"'),
		description: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		action: actionSchema.optional()
	}),
	...placeholder
});

const ComparisonDef = defineComponent({
	name: 'Comparison',
	description: 'Compare 2-4 options side by side by name, each with a list of attributes.',
	props: z.object({
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		items: z
			.array(
				z.object({
					name: str(),
					attributes: z.array(z.string().max(LIMITS.MAX_STRING_LENGTH)).max(LIMITS.MAX_COMPARISON_ATTRIBUTES)
				})
			)
			.min(1)
			.max(LIMITS.MAX_COMPARISON_ITEMS),
		selectable: z.boolean().optional(),
		action: actionSchema.optional()
	}),
	...placeholder
});

const TableDef = defineComponent({
	name: 'Table',
	description: 'A simple data table with columns and rows.',
	props: z.object({
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		columns: z.array(z.string().max(LIMITS.MAX_STRING_LENGTH)).min(1).max(LIMITS.MAX_TABLE_COLUMNS),
		rows: z
			.array(z.array(z.string().max(LIMITS.MAX_STRING_LENGTH)).max(LIMITS.MAX_TABLE_COLUMNS))
			.max(LIMITS.MAX_TABLE_ROWS),
		action: actionSchema.optional()
	}),
	...placeholder
});

const BadgeDef = defineComponent({
	name: 'Badge',
	description: 'A small inline label/tag (status, category).',
	props: z.object({ label: str(), action: actionSchema.optional() }),
	...placeholder
});

const DividerDef = defineComponent({
	name: 'Divider',
	description: 'A horizontal separator between sections.',
	props: z.object({}),
	...placeholder
});

const leafRefs = [MetricDef.ref, ComparisonDef.ref, TableDef.ref, BadgeDef.ref, DividerDef.ref];

// --- Containers ---
const CardDef = defineComponent({
	name: 'Card',
	description: 'A titled surface that groups child components.',
	props: z.object({
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		children: z.array(z.union(leafRefs)).max(LIMITS.MAX_CHILDREN),
		action: actionSchema.optional()
	}),
	...placeholder
});

// Containers are defined progressively so children unions avoid self-reference
// while still allowing rich composition (Stack may hold any container).
const RowDef = defineComponent({
	name: 'Row',
	description: 'Horizontal layout container (wraps on small screens).',
	props: z.object({ children: z.array(z.union([...leafRefs, CardDef.ref])).max(LIMITS.MAX_CHILDREN) }),
	...placeholder
});

const GridDef = defineComponent({
	name: 'Grid',
	description: 'Responsive grid of 2-3 columns. Use for side-by-side cards.',
	props: z
		.object({ children: z.array(z.union([...leafRefs, CardDef.ref, RowDef.ref])).max(LIMITS.MAX_CHILDREN) }),
	...placeholder
});

const SectionDef = defineComponent({
	name: 'Section',
	description: 'A titled section that groups children (no card chrome).',
	props: z.object({
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		children: z.array(z.union([...leafRefs, CardDef.ref, RowDef.ref, GridDef.ref])).max(LIMITS.MAX_CHILDREN)
	}),
	...placeholder
});

const StackDef = defineComponent({
	name: 'Stack',
	description: 'Vertical layout container. Use as the root for most responses.',
	props: z
		.object({
			children: z
				.array(z.union([...leafRefs, CardDef.ref, RowDef.ref, GridDef.ref, SectionDef.ref]))
				.max(LIMITS.MAX_CHILDREN)
		}),
	...placeholder
});

export const openuiLibrary = createLibrary({
	components: [
		MetricDef,
		ComparisonDef,
		TableDef,
		BadgeDef,
		DividerDef,
		CardDef,
		StackDef,
		RowDef,
		GridDef,
		SectionDef
	]
});

export const catalogComponentNames = [
	'Metric',
	'Comparison',
	'Table',
	'Badge',
	'Divider',
	'Card',
	'Stack',
	'Row',
	'Grid',
	'Section'
] as const;

/** OpenUI component name -> canonical node type. */
export const COMPONENT_TYPE_MAP: Record<string, string> = {
	Metric: 'metric',
	Comparison: 'comparison',
	Table: 'table',
	Badge: 'badge',
	Divider: 'divider',
	Card: 'card',
	Stack: 'stack',
	Row: 'row',
	Grid: 'grid',
	Section: 'section'
};
