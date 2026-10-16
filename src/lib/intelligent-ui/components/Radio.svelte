<script lang="ts">
	export let label: string;
	export let value: string;
	export let options: string[] = [];
	export let binding: string | undefined = undefined;
	export let onBind: (name: string, value: unknown) => void = () => {};

	const group = `iu-radio-${Math.random().toString(36).slice(2, 8)}`;
</script>

<fieldset disabled={!binding}>
	<legend class="mb-1 text-sm text-gray-600 dark:text-gray-300">{label}</legend>
	<div class="flex flex-col gap-1.5">
		{#each options as opt (opt)}
			<label class="flex cursor-pointer items-center gap-2">
				<input
					type="radio"
					name={group}
					value={opt}
					checked={value === opt}
					class="h-4 w-4 accent-indigo-500"
					on:change={() => binding && onBind(binding, opt)}
				/>
				<span class="text-sm text-gray-700 dark:text-gray-200">{opt}</span>
			</label>
		{/each}
	</div>
</fieldset>
