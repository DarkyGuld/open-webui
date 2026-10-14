<script lang="ts">
	export let title: string | undefined = undefined;
	export let items: { name: string; attributes: string[] }[] = [];

	$: cols = items.length >= 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2';
</script>

<div class="my-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
	{#if title}
		<div class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">{title}</div>
	{/if}
	<div class="grid gap-3 {cols}">
		{#each items as item, i (i)}
			<div class="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
				<div class="text-sm font-semibold break-words text-gray-900 dark:text-gray-100">
					{item.name}
				</div>
				{#if item.attributes.length}
					<ul class="mt-2 space-y-1">
						{#each item.attributes as attr, j (j)}
							<li class="text-xs break-words text-gray-600 dark:text-gray-400">{attr}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	</div>
</div>
