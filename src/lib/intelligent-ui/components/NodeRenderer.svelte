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
	import ActionButton from './ActionButton.svelte';

	export let node: UINode;
	export let onAction: (a: UIAction) => void = () => {};
	export let selected: string | undefined = undefined;
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
{:else if node.type === 'stack'}
	<div class="my-3 flex flex-col gap-3">
		{#each node.children as child, i (i)}
			<svelte:self node={child} {onAction} {selected} />
		{/each}
	</div>
{:else if node.type === 'row'}
	<div class="my-3 flex flex-wrap gap-3">
		{#each node.children as child, i (i)}
			<div class="min-w-[12rem] flex-1">
				<svelte:self node={child} {onAction} {selected} />
			</div>
		{/each}
	</div>
{:else if node.type === 'grid'}
	<div class="my-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
		{#each node.children as child, i (i)}
			<svelte:self node={child} {onAction} {selected} />
		{/each}
	</div>
{:else if node.type === 'section'}
	<div class="my-3">
		{#if node.title}
			<div class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">{node.title}</div>
		{/if}
		<div class="flex flex-col gap-3">
			{#each node.children as child, i (i)}
				<svelte:self node={child} {onAction} {selected} />
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
				<svelte:self node={child} {onAction} {selected} />
			{/each}
		</div>
		<ActionButton action={node.action} {onAction} />
	</div>
{/if}
