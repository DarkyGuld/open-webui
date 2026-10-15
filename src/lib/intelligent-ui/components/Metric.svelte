<script lang="ts">
	import type { UIAction } from '$lib/intelligent-ui/types';
	import ActionButton from './ActionButton.svelte';

	export let label: string;
	export let value: string;
	export let description: string | undefined = undefined;
	export let action: UIAction | undefined = undefined;
	export let onAction: (a: UIAction) => void = () => {};
</script>

<div
	class="my-3 rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
>
	<div class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
		{label}
	</div>
	<div class="mt-1 text-2xl font-semibold break-words text-gray-900 dark:text-gray-100">
		{value}
	</div>
	{#if description}
		<div class="mt-1 text-xs break-words text-gray-400 dark:text-gray-500">{description}</div>
	{/if}
	<ActionButton {action} {onAction} />
</div>
