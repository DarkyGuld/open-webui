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
	import Textarea from './Textarea.svelte';
	import Radio from './Radio.svelte';
	import Progress from './Progress.svelte';
	import Chart from './Chart.svelte';
	import Timeline from './Timeline.svelte';
	import Gallery from './Gallery.svelte';
	import ActionButton from './ActionButton.svelte';

	export let node: UINode;
	export let onAction: (a: UIAction) => void = () => {};
	export let selected: string | undefined = undefined;
	export let onBind: (name: string, value: unknown) => void = () => {};
	export let onOpenUIAction: (a: import('$lib/intelligent-ui/types').OpenUIAction | import('$lib/intelligent-ui/types').OpenUIAction[]) => void = () => {};

	// Per-instance id prefix (tabs) — avoids duplicate DOM ids across blocks.
	const uid = Math.random().toString(36).slice(2, 8);
	let activeTab = 0;

	function onTabKey(e: KeyboardEvent, i: number, count: number) {
		let next: number | null = null;
		if (e.key === 'ArrowRight') next = (i + 1) % count;
		else if (e.key === 'ArrowLeft') next = (i - 1 + count) % count;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = count - 1;
		if (next !== null) {
			e.preventDefault();
			activeTab = next;
		}
	}
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
	<div>
		<Badge label={node.label} action={node.action} {onAction} />
	</div>
{:else if node.type === 'divider'}
	<Divider />
{:else if node.type === 'button'}
	<Button label={node.label} action={node.action} {onOpenUIAction} />
{:else if node.type === 'data'}
	<Data source={node.source} title={node.title} />
{:else if node.type === 'progress'}
	<Progress label={node.label} value={node.value} status={node.status} source={node.source} />
{:else if node.type === 'chart'}
	<Chart
		chartType={node.chartType}
		title={node.title}
		labels={node.labels}
		series={node.series}
		source={node.source}
	/>
{:else if node.type === 'timeline'}
	<Timeline title={node.title} items={node.items} source={node.source} />
{:else if node.type === 'gallery'}
	<Gallery title={node.title} items={node.items} />
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
{:else if node.type === 'textarea'}
	<Textarea
		label={node.label}
		value={node.value}
		placeholder={node.placeholder}
		binding={node.binding}
		{onBind}
	/>
{:else if node.type === 'radio'}
	<Radio label={node.label} value={node.value} options={node.options} binding={node.binding} {onBind} />
{:else if node.type === 'stack'}
	<div class="flex flex-col gap-3">
		{#each node.children as child, i (i)}
			<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
		{/each}
	</div>
{:else if node.type === 'row'}
	<div class="flex flex-wrap gap-3">
		{#each node.children as child, i (i)}
			<div class="min-w-[10rem] flex-1">
				<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
			</div>
		{/each}
	</div>
{:else if node.type === 'grid'}
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
		{#each node.children as child, i (i)}
			<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
		{/each}
	</div>
{:else if node.type === 'section'}
	<div>
		{#if node.title}
			<div class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{node.title}</div>
		{/if}
		<div class="flex flex-col gap-3">
			{#each node.children as child, i (i)}
				<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
			{/each}
		</div>
	</div>
{:else if node.type === 'card'}
	<div class="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
		{#if node.title}
			<div class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{node.title}</div>
		{/if}
		<div class="flex flex-col gap-3">
			{#each node.children as child, i (i)}
				<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
			{/each}
		</div>
		<ActionButton action={node.action} {onAction} />
	</div>
{:else if node.type === 'tabs'}
	<div>
		<div
			class="flex items-center gap-1 overflow-x-auto border-b border-gray-100 dark:border-gray-800"
			role="tablist"
		>
			{#each node.children as tab, i (i)}
				<button
					type="button"
					role="tab"
					id={`iu-tab-${uid}-${i}`}
					aria-selected={activeTab === i}
					aria-controls={`iu-tabpanel-${uid}-${i}`}
					tabindex={activeTab === i ? 0 : -1}
					class="-mb-px max-w-[14rem] cursor-pointer truncate rounded-t-md border-b-2 px-3 py-1.5 text-sm whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-hidden {activeTab ===
					i
						? 'border-indigo-500 font-medium text-indigo-600 dark:text-indigo-400'
						: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
					on:click={() => (activeTab = i)}
					on:keydown={(e) => onTabKey(e, i, node.children.length)}
				>
					{tab.type === 'tab' ? tab.title : ''}
				</button>
			{/each}
		</div>
		{#each node.children as tab, i (i)}
			{#if activeTab === i && tab.type === 'tab'}
				<div
					role="tabpanel"
					id={`iu-tabpanel-${uid}-${i}`}
					aria-labelledby={`iu-tab-${uid}-${i}`}
					tabindex="0"
					class="pt-3 focus:outline-hidden"
				>
					{#each tab.children as child, j (j)}
						<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
					{/each}
				</div>
			{/if}
		{/each}
	</div>
{:else if node.type === 'tab'}
	<div class="flex flex-col gap-3">
		{#each node.children as child, i (i)}
			<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
		{/each}
	</div>
{:else if node.type === 'field'}
	<div>
		<div class="text-sm font-medium text-gray-700 dark:text-gray-200">{node.title}</div>
		{#if node.description}
			<div class="mb-1 text-xs text-gray-400 dark:text-gray-500">{node.description}</div>
		{/if}
		{#each node.children as child, i (i)}
			<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
		{/each}
		{#if node.error}
			<div class="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">{node.error}</div>
		{/if}
	</div>
{:else if node.type === 'form'}
	<form
		class="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
		on:submit|preventDefault
	>
		{#if node.title}
			<div class="text-sm font-semibold text-gray-700 dark:text-gray-200">{node.title}</div>
		{/if}
		{#each node.children as child, i (i)}
			<svelte:self node={child} {onAction} {selected} {onBind} {onOpenUIAction} />
		{/each}
		<ActionButton action={node.action} {onAction} />
	</form>
{/if}
