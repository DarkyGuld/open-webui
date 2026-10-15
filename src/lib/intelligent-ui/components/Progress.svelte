<script lang="ts">
	// Bounded 0-100 progress. The value may be a $state expression, or derived
	// from an allow-listed query (first numeric cell).
	import { getContext } from 'svelte';
	import {
		emptyBinding,
		firstNumeric,
		loadBoundQuery,
		type QueryBinding
	} from '$lib/intelligent-ui/query-binding';

	const i18n: any = getContext('i18n');

	export let label: string | undefined = undefined;
	export let value: number = 0;
	export let status: string | undefined = undefined;
	export let source: string | undefined = undefined;

	let binding: QueryBinding = emptyBinding();
	let loadedSource: string | undefined = undefined;

	function clamp(n: number): number {
		if (!Number.isFinite(n)) return 0;
		return Math.max(0, Math.min(100, n));
	}

	$: if (source && source !== loadedSource) {
		loadedSource = source;
		binding = emptyBinding();
		loadBoundQuery(source, (b) => (binding = b));
	}

	$: derived =
		source && binding.status === 'success' && binding.result ? firstNumeric(binding.result) : null;
	$: shown = Math.round(derived != null ? clamp(derived) : clamp(value));
	$: loading = !!source && (binding.status === 'idle' || binding.status === 'loading');
</script>

<div class="my-3">
	{#if label || status}
		<div class="mb-1 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
			<span>{label ?? ''}</span>
			<span class="font-mono text-xs text-gray-500 dark:text-gray-400">{status ?? `${shown}%`}</span>
		</div>
	{/if}
	<div
		role="progressbar"
		aria-valuemin="0"
		aria-valuemax="100"
		aria-valuenow={shown}
		aria-label={label ?? undefined}
		class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
	>
		<div
			class="h-full rounded-full bg-indigo-500 transition-[width] duration-300 dark:bg-indigo-400 {loading
				? 'animate-pulse'
				: ''}"
			style="width: {shown}%"
		></div>
	</div>
	{#if source && binding.status === 'error'}
		<div class="mt-1 text-xs text-red-500 dark:text-red-400">{$i18n.t('Could not load data')}</div>
	{/if}
</div>
