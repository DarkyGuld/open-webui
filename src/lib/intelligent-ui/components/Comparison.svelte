<script lang="ts">
	import type { UIAction } from '$lib/intelligent-ui/types';
	import ActionButton from './ActionButton.svelte';

	export let title: string | undefined = undefined;
	export let items: { name: string; attributes: string[] }[] = [];
	export let selectable = false;
	export let selected: string | undefined = undefined;
	export let action: UIAction | undefined = undefined;
	export let onAction: (a: UIAction) => void = () => {};

	$: cols =
		items.length >= 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2';

	function select(name: string) {
		if (!selectable) return;
		onAction({ type: 'select', value: name });
	}
</script>

<div class="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
	{#if title}
		<div class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">{title}</div>
	{/if}
	<div class="grid gap-3 {cols}">
		{#each items as item, i (i)}
			<div
				class="rounded-lg border p-3 transition {selected === item.name
					? 'border-indigo-400 ring-1 ring-indigo-300 dark:border-indigo-500'
					: 'border-gray-100 dark:border-gray-800'} {selectable
					? 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-700'
					: ''}"
				role={selectable ? 'button' : undefined}
				tabindex={selectable ? 0 : undefined}
				aria-pressed={selectable ? selected === item.name : undefined}
				on:click={() => select(item.name)}
				on:keydown={(e) => {
					if (selectable && (e.key === 'Enter' || e.key === ' ')) {
						e.preventDefault();
						select(item.name);
					}
				}}
			>
				<div class="text-sm font-semibold break-words text-gray-900 dark:text-gray-100">
					{item.name}
				</div>
				{#if item.attributes.length}
					<ul class="mt-2 space-y-1">
						{#each item.attributes as attr, j (j)}
							<li class="text-xs break-words text-gray-600 dark:text-gray-400">{attr}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	</div>
	<ActionButton {action} {onAction} />
</div>
