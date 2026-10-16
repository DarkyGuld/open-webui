<script lang="ts">
	// Allow-listed read-only query bound to native UI, with the standardized
	// idle -> loading -> success | error | empty lifecycle (QueryState).
	import { onMount } from 'svelte';
	import { emptyBinding, loadBoundQuery, type QueryBinding } from '$lib/intelligent-ui/query-binding';
	import { columnAlign } from '$lib/intelligent-ui/table-utils';
	import QueryState from './QueryState.svelte';

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

<div class="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
	{#if title}
		<div
			class="border-b border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
		>
			{title}
		</div>
	{/if}

	<QueryState
		status={state}
		error={errorMessage}
		empty={result ? result.rows.length === 0 : false}
		onRetry={load}
	>
		{#if result}
			<div class="max-h-[28rem] overflow-auto">
				<table class="w-full border-collapse text-left text-sm">
					<thead
						class="sticky top-0 z-10 bg-gray-50 text-xs tracking-wide text-gray-500 uppercase dark:bg-gray-900 dark:text-gray-400"
					>
						<tr>
							{#each result.columns as col, i (i)}
								<th
									class="px-4 py-2 font-medium whitespace-nowrap {columnAlign(result.rows, i) === 'right'
										? 'text-right'
										: 'text-left'}"
								>
									{col}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each result.rows as row, r (r)}
							<tr class="border-t border-gray-100 dark:border-gray-800">
								{#each row as cell, c (c)}
									<td
										class="px-4 py-2 align-top break-words text-gray-700 dark:text-gray-300 {columnAlign(
											result.rows,
											c
										) === 'right'
											? 'text-right tabular-nums'
											: ''}"
									>
										{cell}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</QueryState>
</div>
