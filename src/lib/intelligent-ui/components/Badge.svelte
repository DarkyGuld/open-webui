<script lang="ts">
	import type { BadgeTone, UIAction } from '$lib/intelligent-ui/types';
	export let label: string;
	export let tone: BadgeTone | undefined = undefined;
	export let action: UIAction | undefined = undefined;
	export let onAction: (a: UIAction) => void = () => {};

	const TONE: Record<BadgeTone, string> = {
		neutral: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
		positive: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
		warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
		negative: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
	};
	$: toneClass = TONE[tone ?? 'neutral'];
</script>

{#if action && (action.type === 'send_prompt' || action.type === 'confirm')}
	<button
		type="button"
		class="inline-flex cursor-pointer items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition hover:brightness-95 {toneClass}"
		on:click={() => onAction(action)}
	>
		{label}
	</button>
{:else}
	<span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium {toneClass}">
		{label}
	</span>
{/if}
