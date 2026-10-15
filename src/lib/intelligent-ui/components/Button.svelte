<script lang="ts">
	import type { OpenUIAction } from '$lib/intelligent-ui/types';

	export let label: string;
	export let action: OpenUIAction | OpenUIAction[] | undefined = undefined;
	export let onOpenUIAction: (a: OpenUIAction | OpenUIAction[]) => void = () => {};
</script>

<button
	type="button"
	disabled={!action}
	class="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-default disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
	on:click={() => action && onOpenUIAction(action)}
>
	<span class="line-clamp-1">{label}</span>
</button>
