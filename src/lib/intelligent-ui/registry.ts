import type { Component } from 'svelte';
import Metric from './components/Metric.svelte';
import Comparison from './components/Comparison.svelte';
import Table from './components/Table.svelte';
import type { UINodeType } from './types';

/**
 * Maps an allow-listed component type to its native Open WebUI Svelte component.
 * Milestone 2 allow-list: metric, comparison, table — nothing else.
 */
export const componentRegistry: Record<UINodeType, Component<any>> = {
	metric: Metric,
	comparison: Comparison,
	table: Table
};

export function isSupportedComponent(type: string): type is UINodeType {
	return Object.prototype.hasOwnProperty.call(componentRegistry, type);
}

export function getComponent(type: string): Component<any> | null {
	return isSupportedComponent(type) ? componentRegistry[type] : null;
}

export const SUPPORTED_COMPONENTS: UINodeType[] = Object.keys(componentRegistry) as UINodeType[];
