<script lang="ts">
	// Shared, standardized states for query-backed components so loading / empty /
	// error look identical everywhere and don't jump. Success renders the slot.
	import { getContext } from 'svelte';
	const i18n: any = getContext('i18n');

	export let status: 'idle' | 'loading' | 'success' | 'error' = 'loading';
	export let error: string = '';
	export let empty: boolean = false;
	export let onRetry: (() => void) | undefined = undefined;
	/** Skeleton row count (keeps a stable height, avoids layout jump). */
	export let rows: number = 3;
</script>

{#if status === 'idle' || status === 'loading'}
	<div class="space-y-2 p-4" aria-busy="true">
		{#each Array(rows) as _, i (i)}
			<div class="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" style="width: {90 - i * 18}%"></div>
		{/each}
		<span class="sr-only">{$i18n.t('Loading…')}</span>
	</div>
{:else if status === 'error'}
	<div class="flex items-center justify-between gap-3 p-4">
		<span class="text-sm text-gray-500 dark:text-gray-400">{$i18n.t('Couldn’t load this data')}</span>
		{#if onRetry}
			<button
				type="button"
				class="shrink-0 cursor-pointer rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-hidden dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
				on:click={onRetry}>{$i18n.t('Retry')}</button
			>
		{/if}
		<span class="sr-only" data-query-error>{error}</span>
	</div>
{:else if empty}
	<div class="p-4 text-sm text-gray-400 dark:text-gray-500">{$i18n.t('No data')}</div>
{:else}
	<slot />
{/if}
