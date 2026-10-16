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
import { createLibrary, defineComponent, markReactive, tagSchemaId } from '@openuidev/lang-core';
import { z } from 'zod';
import { actionSchema } from './action-schema';
import { CATALOG_VERSION, LIMITS } from './limits';

export const CATALOG_VERSION_ID = CATALOG_VERSION;

// Abbreviate the shared action union in generated signatures: without this the
// full union is re-expanded for every component that accepts an `action`,
// which dominates the catalog prompt. `tagSchemaId` affects prompt output only
// (JSON Schema $defs are unchanged), so parsing/validation are unaffected.
tagSchemaId(actionSchema, 'Action');

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

// --- Inputs (reactive `value` is two-way bound to a $state variable) ---
const SliderDef = defineComponent({
	name: 'Slider',
	description: 'A numeric slider bound to a $state variable.',
	props: z.object({
		label: str(),
		value: z.number(),
		min: z.number(),
		max: z.number(),
		step: z.number().optional()
	}),
	...placeholder
});

const SelectDef = defineComponent({
	name: 'Select',
	description: 'A dropdown bound to a $state variable.',
	props: z.object({ label: str(), value: str(), options: z.array(str()).min(1).max(LIMITS.MAX_CHILDREN) }),
	...placeholder
});

const SwitchDef = defineComponent({
	name: 'Switch',
	description: 'An on/off switch bound to a $state variable.',
	props: z.object({ label: str(), value: z.boolean() }),
	...placeholder
});

const CheckboxDef = defineComponent({
	name: 'Checkbox',
	description: 'A checkbox bound to a $state variable.',
	props: z.object({ label: str(), value: z.boolean() }),
	...placeholder
});

const InputDef = defineComponent({
	name: 'Input',
	description: 'A single-line text input bound to a $state variable.',
	props: z.object({ label: str(), value: str(), placeholder: z.string().max(LIMITS.MAX_STRING_LENGTH).optional() }),
	...placeholder
});

// Mark the bound prop of each input as reactive (keeps ReactiveAssign through
// evaluation so we can wire two-way binding).
for (const def of [SliderDef, SelectDef, SwitchDef, CheckboxDef, InputDef]) {
	markReactive((def.props as any).shape.value);
}

// Button with a host-executed action (e.g. `@Set($x, 20)`, `@Reset($x)`,
// `@ToAssistant("...")`, `@Run(query)`). lang-core parses the action into an
// ActionStep; we normalize it in the engine.
const ButtonDef = defineComponent({
	name: 'Button',
	description:
		'A clickable button. The second argument is an action such as @Set($x, 20), @Reset($x), @ToAssistant("...") or @Run(query).',
	props: z.object({ label: str(), action: z.any().optional(), args: z.any().optional() }),
	...placeholder
});

// Read-only data view bound to an allow-listed query source (see queries.ts).
const DataDef = defineComponent({
	name: 'Data',
	description:
		'A read-only data table bound to an allow-listed source. Sources: conversation.notes, library.files, knowledge.collections.',
	props: z.object({
		source: str(),
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional()
	}),
	...placeholder
});

// --- M9.4 breadth: progress / chart / timeline / gallery ---

const ProgressDef = defineComponent({
	name: 'Progress',
	description:
		'A bounded 0-100 progress bar with an optional label and status. The value may be an expression of $state.',
	props: z.object({
		label: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		value: z.number(),
		status: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		source: z.string().max(120).optional()
	}),
	...placeholder
});

const ChartDef = defineComponent({
	name: 'Chart',
	description:
		'A chart (line, bar, area, pie or donut) from typed data: labels plus one or more named numeric series.',
	props: z.object({
		chartType: z.enum(['line', 'bar', 'area', 'pie', 'donut']),
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		labels: z.array(z.string().max(LIMITS.MAX_STRING_LENGTH)).max(LIMITS.MAX_CHART_POINTS),
		series: z
			.array(
				z.object({
					name: str(),
					values: z.array(z.number()).max(LIMITS.MAX_CHART_POINTS)
				})
			)
			.max(LIMITS.MAX_CHART_SERIES),
		source: z.string().max(120).optional()
	}),
	...placeholder
});

const TimelineDef = defineComponent({
	name: 'Timeline',
	description:
		'An ordered list of events, each with a title and optional timestamp, description and status.',
	props: z.object({
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		items: z
			.array(
				z.object({
					title: str(),
					timestamp: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
					description: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
					status: z.enum(['done', 'active', 'pending', 'error']).optional()
				})
			)
			.max(LIMITS.MAX_TIMELINE_ITEMS),
		source: z.string().max(120).optional()
	}),
	...placeholder
});

const GalleryDef = defineComponent({
	name: 'Gallery',
	description:
		'An image gallery (single image or responsive grid) using safe Open WebUI media references.',
	props: z.object({
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		items: z
			.array(
				z.object({
					src: str(),
					caption: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
					alt: z.string().max(LIMITS.MAX_STRING_LENGTH).optional()
				})
			)
			.max(LIMITS.MAX_GALLERY_ITEMS)
	}),
	...placeholder
});

const TextareaDef = defineComponent({
	name: 'Textarea',
	description: 'A multi-line text input bound to a $state variable.',
	props: z.object({
		label: str(),
		value: str(),
		placeholder: z.string().max(LIMITS.MAX_STRING_LENGTH).optional()
	}),
	...placeholder
});

const RadioDef = defineComponent({
	name: 'Radio',
	description: 'A radio group bound to a $state variable (pick one of the options).',
	props: z.object({
		label: str(),
		value: str(),
		options: z.array(str()).min(1).max(LIMITS.MAX_RADIO_OPTIONS)
	}),
	...placeholder
});

for (const def of [TextareaDef, RadioDef]) {
	markReactive((def.props as any).shape.value);
}

const leafRefs = [
	DataDef.ref,
	MetricDef.ref,
	ComparisonDef.ref,
	TableDef.ref,
	BadgeDef.ref,
	DividerDef.ref,
	ButtonDef.ref,
	SliderDef.ref,
	SelectDef.ref,
	SwitchDef.ref,
	CheckboxDef.ref,
	InputDef.ref,
	TextareaDef.ref,
	RadioDef.ref,
	ProgressDef.ref,
	ChartDef.ref,
	TimelineDef.ref,
	GalleryDef.ref
];

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

// --- M9.4 composition: tabs / field / form ---

const TabDef = defineComponent({
	name: 'Tab',
	description: 'One tab panel: a label (title) and its child components. Only valid inside Tabs.',
	props: z.object({
		title: str(),
		children: z
			.array(z.union([...leafRefs, CardDef.ref, RowDef.ref, GridDef.ref, SectionDef.ref]))
			.max(LIMITS.MAX_CHILDREN)
	}),
	...placeholder
});

const TabsDef = defineComponent({
	name: 'Tabs',
	description:
		'A tabbed panel. Its children are Tab components; switching tabs is local and needs no model call.',
	props: z.object({
		children: z.array(TabDef.ref).min(1).max(LIMITS.MAX_TABS)
	}),
	...placeholder
});

const FieldDef = defineComponent({
	name: 'Field',
	description:
		'A labelled form field: a label (title), optional description, optional validation error, and its input child.',
	props: z.object({
		title: str(),
		children: z.array(z.union([...leafRefs, RowDef.ref])).max(LIMITS.MAX_CHILDREN),
		description: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		error: z.string().max(LIMITS.MAX_STRING_LENGTH).optional()
	}),
	...placeholder
});

const FormDef = defineComponent({
	name: 'Form',
	description:
		'A form: groups Field components and inputs. Use Button with @Set/@Reset or a registered mutation for side effects.',
	props: z.object({
		title: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
		children: z
			.array(z.union([...leafRefs, FieldDef.ref, RowDef.ref, GridDef.ref, SectionDef.ref]))
			.max(LIMITS.MAX_FORM_FIELDS)
	}),
	...placeholder
});

const StackDef = defineComponent({
	name: 'Stack',
	description: 'Vertical layout container. Use as the root for most responses.',
	props: z
		.object({
			children: z
				.array(
					z.union([
						...leafRefs,
						CardDef.ref,
						RowDef.ref,
						GridDef.ref,
						SectionDef.ref,
						TabsDef.ref,
						FieldDef.ref,
						FormDef.ref
					])
				)
				.max(LIMITS.MAX_CHILDREN)
		}),
	...placeholder
});

export const openuiLibrary = createLibrary({
	components: [
		DataDef,
		MetricDef,
		ComparisonDef,
		TableDef,
		BadgeDef,
		DividerDef,
		ButtonDef,
		SliderDef,
		SelectDef,
		SwitchDef,
		CheckboxDef,
		InputDef,
		TextareaDef,
		RadioDef,
		ProgressDef,
		ChartDef,
		TimelineDef,
		GalleryDef,
		CardDef,
		StackDef,
		RowDef,
		GridDef,
		SectionDef,
		TabDef,
		TabsDef,
		FieldDef,
		FormDef
	]
});

export const catalogComponentNames = [
	'Data',
	'Metric',
	'Comparison',
	'Table',
	'Badge',
	'Divider',
	'Button',
	'Slider',
	'Select',
	'Switch',
	'Checkbox',
	'Input',
	'Textarea',
	'Radio',
	'Progress',
	'Chart',
	'Timeline',
	'Gallery',
	'Card',
	'Stack',
	'Row',
	'Grid',
	'Section',
	'Tab',
	'Tabs',
	'Field',
	'Form'
] as const;

/** OpenUI component name -> canonical node type. */
export const COMPONENT_TYPE_MAP: Record<string, string> = {
	Data: 'data',
	Metric: 'metric',
	Comparison: 'comparison',
	Table: 'table',
	Badge: 'badge',
	Divider: 'divider',
	Button: 'button',
	Slider: 'slider',
	Select: 'select',
	Switch: 'switch',
	Checkbox: 'checkbox',
	Input: 'input',
	Textarea: 'textarea',
	Radio: 'radio',
	Progress: 'progress',
	Chart: 'chart',
	Timeline: 'timeline',
	Gallery: 'gallery',
	Card: 'card',
	Stack: 'stack',
	Row: 'row',
	Grid: 'grid',
	Section: 'section',
	Tab: 'tab',
	Tabs: 'tabs',
	Field: 'field',
	Form: 'form'
};
