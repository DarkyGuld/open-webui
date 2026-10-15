/**
 * Conservative security limits for Intelligent UI. Single source of truth —
 * do not scatter magic numbers elsewhere.
 */

export const SUPPORTED_VERSION = 1; // transport/envelope version
export const OUTPUT_SCHEMA_VERSION = 1; // persisted output[] item version
export const CATALOG_VERSION = 4; // current catalog contract (v1–v3 items still valid)
export const SUPPORTED_CATALOG_VERSIONS = [1, 2, 3, 4] as const;

export const LIMITS = {
	MAX_PAYLOAD_BYTES: 24_576,
	MAX_NODES: 120, // total nodes across the tree
	MAX_DEPTH: 6, // nesting depth
	MAX_CHILDREN: 12, // children per container
	MAX_STRING_LENGTH: 2_000,
	MAX_TABLE_ROWS: 50,
	MAX_TABLE_COLUMNS: 12,
	MAX_COMPARISON_ITEMS: 4,
	MAX_COMPARISON_ATTRIBUTES: 12,
	MAX_ACTION_PROMPT_LENGTH: 2_000,
	MAX_STATE_BYTES: 4_096,

	// M9.4 component breadth
	MAX_TABS: 6, // tabs per Tabs component
	MAX_CHART_POINTS: 60, // points per series / labels per chart
	MAX_CHART_SERIES: 6, // datasets per chart
	MAX_TIMELINE_ITEMS: 30, // events per timeline
	MAX_GALLERY_ITEMS: 12, // media items per gallery
	MAX_FORM_FIELDS: 20, // fields per form
	MAX_RADIO_OPTIONS: 12 // options per radio group
} as const;
