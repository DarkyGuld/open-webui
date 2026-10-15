<script lang="ts">
	// Allow-listed read-only query bound to native UI, with typed lifecycle:
	// idle -> loading -> success | error. Unknown source -> safe error state.
	import { getContext, onMount } from 'svelte';
	import {
		emptyBinding,
		loadBoundQuery,
		type QueryBinding
	} from '$lib/intelligent-ui/query-binding';

	const i18n: any = getContext('i18n');

	export let source: string;
	export let title: string | undefined = undefined;

	let binding: QueryBinding = emptyBinding();
	$: state = binding.status;
	$: result = binding.result;
	$: errorMessage = binding.error;

	function load() {
		binding = emptyBinding();
		loadBoundQuery(source, (b) => (binding = b));
	}

	onMount(load);
	$: if (source) load();
</script>

<div class="my-3 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
	{#if title}
		<div
			class="border-b border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
		>
			{title}
		</div>
	{/if}

	{#if state === 'loading' || state === 'idle'}
		<div class="space-y-2 p-4" aria-busy="true">
			{#each [1, 2, 3] as i (i)}
				<div class="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800"></div>
			{/each}
			<div class="pt-1 text-xs text-gray-400">{$i18n.t('Loading…')}</div>
		</div>
	{:else if state === 'error'}
		<div class="p-4 text-sm text-red-500 dark:text-red-400">
			{$i18n.t('Could not load data')}
			<span class="sr-only" data-query-error>{errorMessage}</span>
		</div>
	{:else if result && result.rows.length === 0}
		<div class="p-4 text-sm text-gray-400">{$i18n.t('No data')}</div>
	{:else if result}
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-left text-sm">
				<thead
					class="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase dark:bg-gray-900 dark:text-gray-400"
				>
					<tr>
						{#each result.columns as col, i (i)}
							<th class="px-4 py-2 font-medium whitespace-nowrap">{col}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each result.rows as row, r (r)}
						<tr class="border-t border-gray-100 dark:border-gray-800">
							{#each row as cell, c (c)}
								<td class="px-4 py-2 align-top break-words text-gray-700 dark:text-gray-300">
									{cell}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
