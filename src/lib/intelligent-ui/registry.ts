import type { Component } from 'svelte';
import Metric from './components/Metric.svelte';
import Comparison from './components/Comparison.svelte';
import Table from './components/Table.svelte';
import Badge from './components/Badge.svelte';
import Divider from './components/Divider.svelte';
import type { UINodeType } from './types';

/**
 * Leaf components. Container components (stack/row/grid/section/card) are
 * rendered by NodeRenderer.svelte (recursive) so nesting works without circular
 * imports.
 */
export const leafRegistry: Partial<Record<UINodeType, Component<any>>> = {
	metric: Metric,
	comparison: Comparison,
	table: Table,
	badge: Badge,
	divider: Divider
};

export const CONTAINER_TYPES: UINodeType[] = ['stack', 'row', 'grid', 'section', 'card'];

export const SUPPORTED_COMPONENTS: UINodeType[] = [
	'metric',
	'comparison',
	'table',
	'badge',
	'divider',
	...CONTAINER_TYPES
];

export function isSupportedComponent(type: string): type is UINodeType {
	return SUPPORTED_COMPONENTS.includes(type as UINodeType);
}

export function getLeafComponent(type: string): Component<any> | null {
	return (leafRegistry as Record<string, Component<any>>)[type] ?? null;
}
