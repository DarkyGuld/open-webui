<script lang="ts">
	export let label: string;
	export let value: number;
	export let min: number;
	export let max: number;
	export let step: number | undefined = undefined;
	export let binding: string | undefined = undefined;
	export let onBind: (name: string, value: unknown) => void = () => {};
</script>

<div>
	<div class="mb-1 flex justify-between text-sm text-gray-600 dark:text-gray-300">
		<span>{label}</span>
		<span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">{value}</span>
	</div>
	<input
		type="range"
		{min}
		{max}
		{step}
		{value}
		disabled={!binding}
		class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-500 dark:bg-gray-700 disabled:cursor-default"
		on:input={(e) => binding && onBind(binding, Number(e.currentTarget.value))}
	/>
</div>
