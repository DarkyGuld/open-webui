<script lang="ts">
	export let label: string;
	export let value: string;
	export let placeholder: string | undefined = undefined;
	export let binding: string | undefined = undefined;
	export let onBind: (name: string, value: unknown) => void = () => {};
</script>

<div>
	<div class="mb-1 text-sm text-gray-600 dark:text-gray-300">{label}</div>
	<input
		type="text"
		{value}
		{placeholder}
		disabled={!binding}
		class="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-hidden focus:border-indigo-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
		on:input={(e) => binding && onBind(binding, e.currentTarget.value)}
	/>
</div>
