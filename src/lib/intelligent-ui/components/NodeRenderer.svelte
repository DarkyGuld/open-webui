<script lang="ts">
	// Recursive renderer for the Intelligent UI node tree. Leaf components are
	// separate Svelte files; containers are rendered inline and recurse via
	// <svelte:self>. All types are native Open WebUI styling.
	import type { UIAction, UINode } from '$lib/intelligent-ui/types';
	import Metric from './Metric.svelte';
	import Comparison from './Comparison.svelte';
	import Table from './Table.svelte';
	import Badge from './Badge.svelte';
	import Divider from './Divider.svelte';
	import Button from './Button.svelte';
	import Data from './Data.svelte';
	import Slider from './Slider.svelte';
	import Select from './Select.svelte';
	import Switch from './Switch.svelte';
	import Checkbox from './Checkbox.svelte';
	import Input from './Input.svelte';
	import ActionButton from './ActionButton.svelte';

	export let node: UINode;
	export let onAction: (a: UIAction) => void = () => {};
	export let selected: string | undefined = undefined;
	export let onBind: (name: string, value: unknown) => void = () => {};
	export let onOpenUIAction: (a: import('$lib/intelligent-ui/types').OpenUIAction | import('$lib/intelligent-ui/types').OpenUIAction[]) => void = () => {};
</script>

{#if node.type === 'metric'}
	<Metric
		label={node.label}
		value={node.value}
		description={node.description}
		action={node.action}
		{onAction}
	/>
{:else if node.type === 'comparison'}
	<Comparison
		title={node.title}
		items={node.items}
		selectable={node.selectable ?? false}
		action={node.action}
		{selected}
		{onAction}
	/>
{:else if node.type === 'table'}
	<Table title={node.title} columns={node.columns} rows={node.rows} action={node.action} {onAction} />
{:else if node.type === 'badge'}
	<div class="my-1">
		<Badge label={node.label} action={node.action} {onAction} />
	</div>
{:else if node.type === 'divider'}
	<Divider />
{:else if node.type === 'button'}
	<Button label={node.label} action={node.action} {onOpenUIAction} />
{:else if node.type === 'data'}
	<Data source={node.source} title={node.title} />
{:else if node.type === 'slider'}
	<Slider
		label={node.label}
		value={node.value}
		min={node.min}
		max={node.max}
		step={node.step}
		binding={node.binding}
		{onBind}
	/>
{:else if node.type === 'select'}
	<Select label={node.label} value={node.value} options={node.options} binding={node.binding} {onBind} />
{:else if node.type === 'switch'}
	<Switch label={node.label} value={node.value} binding={node.binding} {onBind} />
{:else if node.type === 'checkbox'}
	<Checkbox label={node.label} value={node.value} binding={node.binding} {onBind} />
{:else if node.type === 'input'}
	<Input
		label={node.label}
		value={node.value}
		placeholder={node.placeholder}
		binding={node.binding}
		{onBind}
	/>
{:else if node.type === 'stack'}
	<div class="my-3 flex flex-col gap-3">
		{#each node.children as child, i (i)}
			<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
		{/each}
	</div>
{:else if node.type === 'row'}
	<div class="my-3 flex flex-wrap gap-3">
		{#each node.children as child, i (i)}
			<div class="min-w-[12rem] flex-1">
				<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
			</div>
		{/each}
	</div>
{:else if node.type === 'grid'}
	<div class="my-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
		{#each node.children as child, i (i)}
			<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
		{/each}
	</div>
{:else if node.type === 'section'}
	<div class="my-3">
		{#if node.title}
			<div class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">{node.title}</div>
		{/if}
		<div class="flex flex-col gap-3">
			{#each node.children as child, i (i)}
				<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
			{/each}
		</div>
	</div>
{:else if node.type === 'card'}
	<div class="my-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
		{#if node.title}
			<div class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">{node.title}</div>
		{/if}
		<div class="flex flex-col gap-3">
			{#each node.children as child, i (i)}
				<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
			{/each}
		</div>
		<ActionButton action={node.action} {onAction} />
	</div>
{/if}
