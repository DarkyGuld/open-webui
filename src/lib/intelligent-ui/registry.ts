import type { Component } from 'svelte';
import Metric from './components/Metric.svelte';
import Comparison from './components/Comparison.svelte';
import Table from './components/Table.svelte';
import Badge from './components/Badge.svelte';
import Divider from './components/Divider.svelte';
import Button from './components/Button.svelte';
import Data from './components/Data.svelte';
import Slider from './components/Slider.svelte';
import Select from './components/Select.svelte';
import Switch from './components/Switch.svelte';
import Checkbox from './components/Checkbox.svelte';
import Input from './components/Input.svelte';
import Textarea from './components/Textarea.svelte';
import Radio from './components/Radio.svelte';
import Progress from './components/Progress.svelte';
import Chart from './components/Chart.svelte';
import Timeline from './components/Timeline.svelte';
import Gallery from './components/Gallery.svelte';
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
	data: Data,
	slider: Slider,
	select: Select,
	switch: Switch,
	checkbox: Checkbox,
	input: Input,
	textarea: Textarea,
	radio: Radio,
	progress: Progress,
	chart: Chart,
	timeline: Timeline,
	gallery: Gallery
};

export const CONTAINER_TYPES: UINodeType[] = [
	'stack',
	'row',
	'grid',
	'section',
	'card',
	'tabs',
	'tab',
	'field',
	'form'
];

export const SUPPORTED_COMPONENTS: UINodeType[] = [
	'metric',
	'comparison',
	'table',
	'badge',
	'divider',
	'button',
	'data',
	'slider',
	'select',
	'switch',
	'checkbox',
	'input',
	'textarea',
	'radio',
	'progress',
	'chart',
	'timeline',
	'gallery',
	...CONTAINER_TYPES
];

export function isSupportedComponent(type: string): type is UINodeType {
	return SUPPORTED_COMPONENTS.includes(type as UINodeType);
}

export function getLeafComponent(type: string): Component<any> | null {
	return (leafRegistry as Record<string, Component<any>>)[type] ?? null;
}
