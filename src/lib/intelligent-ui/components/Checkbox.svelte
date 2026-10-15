<script lang="ts">
	export let label: string;
	export let value: boolean;
	export let binding: string | undefined = undefined;
	export let onBind: (name: string, value: unknown) => void = () => {};
</script>

<label class="my-2 flex cursor-pointer items-center gap-2">
	<input
		type="checkbox"
		checked={value}
		disabled={!binding}
		class="h-4 w-4 accent-indigo-500"
		on:change={(e) => binding && onBind(binding, e.currentTarget.checked)}
	/>
	<span class="text-sm text-gray-600 dark:text-gray-300">{label}</span>
</label>
