<script lang="ts">
	import type { Tone, UIAction } from '$lib/intelligent-ui/types';
	import ActionButton from './ActionButton.svelte';

	export let label: string;
	export let value: string;
	export let description: string | undefined = undefined;
	export let tone: Tone | undefined = undefined;
	export let action: UIAction | undefined = undefined;
	export let onAction: (a: UIAction) => void = () => {};

	// Subtle semantic accent only — never a colored marketing card.
	const DOT: Record<Tone, string> = {
		neutral: 'bg-gray-300 dark:bg-gray-600',
		positive: 'bg-emerald-500',
		warning: 'bg-amber-500',
		negative: 'bg-red-500'
	};
</script>

<div class="rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
	<div class="flex items-center gap-1.5">
		{#if tone && tone !== 'neutral'}
			<span class="h-1.5 w-1.5 shrink-0 rounded-full {DOT[tone]}" aria-hidden="true"></span>
		{/if}
		<div class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
			{label}
		</div>
	</div>
	<div class="mt-1 text-2xl font-semibold tabular-nums break-words text-gray-900 dark:text-gray-100">
		{value}
	</div>
	{#if description}
		<div class="mt-1 text-xs break-words text-gray-400 dark:text-gray-500">{description}</div>
	{/if}
	<ActionButton {action} {onAction} />
</div>
