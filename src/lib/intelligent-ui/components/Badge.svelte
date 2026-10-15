<script lang="ts">
	import type { UIAction } from '$lib/intelligent-ui/types';
	export let label: string;
	export let action: UIAction | undefined = undefined;
	export let onAction: (a: UIAction) => void = () => {};
</script>

{#if action && (action.type === 'send_prompt' || action.type === 'confirm')}
	<button
		type="button"
		class="inline-flex cursor-pointer items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
		on:click={() => onAction(action)}
	>
		{label}
	</button>
{:else}
	<span
		class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
	>
		{label}
	</span>
{/if}
