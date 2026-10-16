<script lang="ts">
	import type { UIAction } from '$lib/intelligent-ui/types';

	export let action: UIAction | undefined = undefined;
	export let onAction: (a: UIAction) => void = () => {};

	$: label =
		action?.type === 'send_prompt'
			? action.prompt
			: action?.type === 'confirm'
				? action.prompt || 'Confirm'
				: '';
</script>

{#if action && (action.type === 'send_prompt' || action.type === 'confirm')}
	<button
		type="button"
		class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-hidden active:scale-[0.98] dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
		on:click={() => onAction(action)}
	>
		<span class="line-clamp-1">{label}</span>
	</button>
{/if}
