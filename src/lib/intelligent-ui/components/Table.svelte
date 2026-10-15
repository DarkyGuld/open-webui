<script lang="ts">
	import type { UIAction } from '$lib/intelligent-ui/types';
	import ActionButton from './ActionButton.svelte';

	export let title: string | undefined = undefined;
	export let columns: string[] = [];
	export let rows: string[][] = [];
	export let action: UIAction | undefined = undefined;
	export let onAction: (a: UIAction) => void = () => {};
</script>

<div class="my-3 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
	{#if title}
		<div
			class="border-b border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
		>
			{title}
		</div>
	{/if}
	<div class="overflow-x-auto">
		<table class="w-full border-collapse text-left text-sm">
			<thead
				class="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase dark:bg-gray-900 dark:text-gray-400"
			>
				<tr>
					{#each columns as col, i (i)}
						<th class="px-4 py-2 font-medium whitespace-nowrap">{col}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, r (r)}
					<tr class="border-t border-gray-100 dark:border-gray-800">
						{#each columns as _, c (c)}
							<td class="px-4 py-2 align-top break-words text-gray-700 dark:text-gray-300">
								{row[c] ?? ''}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if action}
		<div class="px-4 pb-3">
			<ActionButton {action} {onAction} />
		</div>
	{/if}
</div>
