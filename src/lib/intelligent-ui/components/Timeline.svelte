<script lang="ts">
	// Ordered events. Items may be given directly, or derived from an
	// allow-listed query ([title, timestamp, description, status]).
	import {
		emptyBinding,
		loadBoundQuery,
		timelineFromQuery,
		type QueryBinding
	} from '$lib/intelligent-ui/query-binding';
	import type { TimelineItem } from '$lib/intelligent-ui/types';
	import QueryState from './QueryState.svelte';

	export let title: string | undefined = undefined;
	export let items: TimelineItem[] = [];
	export let source: string | undefined = undefined;

	let binding: QueryBinding = emptyBinding();
	let loadedSource: string | undefined = undefined;

	function load() {
		if (!source) return;
		binding = emptyBinding();
		loadBoundQuery(source, (b) => (binding = b));
	}

	$: if (source && source !== loadedSource) {
		loadedSource = source;
		load();
	}

	$: shown =
		source && binding.status === 'success' && binding.result
			? timelineFromQuery(binding.result)
			: items;
	$: status = source ? binding.status : 'success';

	function dotClass(status: string | undefined): string {
		switch (status) {
			case 'done':
				return 'bg-emerald-500';
			case 'active':
				return 'bg-indigo-500';
			case 'error':
				return 'bg-red-500';
			default:
				return 'bg-gray-300 dark:bg-gray-600';
		}
	}
</script>

<div>
	{#if title}
		<div class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">{title}</div>
	{/if}

	<QueryState
		{status}
		error={binding.error}
		empty={shown.length === 0}
		onRetry={source ? load : undefined}
	>
		<ol class="relative flex flex-col gap-4 border-l border-gray-100 pl-5 dark:border-gray-800">
			{#each shown as ev, i (i)}
				<li class="relative">
					<span
						class="absolute top-1 -left-[1.65rem] h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-gray-950 {dotClass(
							ev.status
						)}"
					></span>
					<div class="flex flex-wrap items-baseline gap-x-2">
						<span class="text-sm font-medium text-gray-800 dark:text-gray-100">{ev.title}</span>
						{#if ev.timestamp}
							<span class="text-xs text-gray-400 dark:text-gray-500">{ev.timestamp}</span>
						{/if}
					</div>
					{#if ev.description}
						<div class="mt-0.5 text-xs break-words text-gray-500 dark:text-gray-400">
							{ev.description}
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	</QueryState>
</div>
