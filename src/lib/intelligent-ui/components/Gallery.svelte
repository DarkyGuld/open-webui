<script lang="ts">
	// Image gallery. Reuses Open WebUI's Image primitive, which enforces the
	// existing media-URL policy (safeImageUrl, allowExternal = false): only
	// same-origin, relative, data: and gravatar URLs load — no arbitrary remote
	// origins, so no client-side IP/UA leaks.
	import Image from '$lib/components/common/Image.svelte';
	import type { GalleryItem } from '$lib/intelligent-ui/types';

	export let title: string | undefined = undefined;
	export let items: GalleryItem[] = [];

	$: single = items.length === 1;
</script>

<div>
	{#if title}
		<div class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">{title}</div>
	{/if}
	<div
		class={single
			? 'grid grid-cols-1'
			: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'}
	>
		{#each items as item, i (i)}
			<figure class="m-0 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
				<Image
					src={item.src}
					alt={item.alt ?? item.caption ?? ''}
					className="block w-full"
					imageClassName={single
						? 'rounded-t-xl max-h-[28rem] w-full object-contain bg-gray-50 dark:bg-gray-900'
						: 'rounded-t-xl aspect-square w-full object-cover bg-gray-50 dark:bg-gray-900'}
				/>
				{#if item.caption}
					<figcaption
						class="border-t border-gray-100 px-3 py-1.5 text-xs break-words text-gray-500 dark:border-gray-800 dark:text-gray-400"
					>
						{item.caption}
					</figcaption>
				{/if}
			</figure>
		{/each}
	</div>
</div>
