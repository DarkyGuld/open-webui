import type { Component } from 'svelte';
import Metric from './components/Metric.svelte';
import Comparison from './components/Comparison.svelte';
import Table from './components/Table.svelte';
import Badge from './components/Badge.svelte';
import Divider from './components/Divider.svelte';
import Button from './components/Button.svelte';
import Slider from './components/Slider.svelte';
import Select from './components/Select.svelte';
import Switch from './components/Switch.svelte';
import Checkbox from './components/Checkbox.svelte';
import Input from './components/Input.svelte';
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
	divider: Divider,
	button: Button,
	slider: Slider,
	select: Select,
	switch: Switch,
	checkbox: Checkbox,
	input: Input
};

export const CONTAINER_TYPES: UINodeType[] = ['stack', 'row', 'grid', 'section', 'card'];

export const SUPPORTED_COMPONENTS: UINodeType[] = [
	'metric',
	'comparison',
	'table',
	'badge',
	'divider',
	'button',
	'slider',
	'select',
	'switch',
	'checkbox',
	'input',
	...CONTAINER_TYPES
];

export function isSupportedComponent(type: string): type is UINodeType {
	return SUPPORTED_COMPONENTS.includes(type as UINodeType);
}

export function getLeafComponent(type: string): Component<any> | null {
	return (leafRegistry as Record<string, Component<any>>)[type] ?? null;
}
