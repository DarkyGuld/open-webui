/**
 * Conservative security limits for Intelligent UI. Single source of truth —
 * do not scatter magic numbers elsewhere.
 */

export const SUPPORTED_VERSION = 1; // transport/envelope version
export const OUTPUT_SCHEMA_VERSION = 1; // persisted output[] item version
export const CATALOG_VERSION = 2; // current catalog contract (v1 items still valid)
export const SUPPORTED_CATALOG_VERSIONS = [1, 2] as const;

export const LIMITS = {
	MAX_PAYLOAD_BYTES: 16_384,
	MAX_NODES: 1, // single root component
	MAX_DEPTH: 1,
	MAX_STRING_LENGTH: 2_000,
	MAX_TABLE_ROWS: 50,
	MAX_TABLE_COLUMNS: 12,
	MAX_COMPARISON_ITEMS: 4,
	MAX_COMPARISON_ATTRIBUTES: 12,
	MAX_ACTION_PROMPT_LENGTH: 2_000,
	MAX_STATE_BYTES: 4_096
} as const;
