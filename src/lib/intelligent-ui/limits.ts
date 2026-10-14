/**
 * Conservative security limits for Intelligent UI. Single source of truth —
 * do not scatter magic numbers elsewhere.
 */

export const SUPPORTED_VERSION = 1;
export const CATALOG_VERSION = 1;

export const LIMITS = {
	MAX_PAYLOAD_BYTES: 16_384,
	MAX_NODES: 1, // Milestone 2: a single root component only
	MAX_DEPTH: 1,
	MAX_STRING_LENGTH: 2_000,
	MAX_TABLE_ROWS: 50,
	MAX_TABLE_COLUMNS: 12,
	MAX_COMPARISON_ITEMS: 4,
	MAX_COMPARISON_ATTRIBUTES: 12
} as const;
