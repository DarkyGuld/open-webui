<script lang="ts">
	import { getContext } from 'svelte';
	import { WEBUI_NAME, showSidebar } from '$lib/stores';
	import Library from '$lib/components/library/Library.svelte';
	const i18n = getContext<typeof import('$lib/i18n').default>('i18n');
</script>

<svelte:head><title>{$i18n.t('library.title')} · {$WEBUI_NAME}</title></svelte:head>
<div
	class="flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out {$showSidebar
		? 'md:max-w-[calc(100%-var(--sidebar-width))]'
		: ''} max-w-full"
>
	<div class="flex-1 max-h-full overflow-y-auto">
		<Library />
	</div>
</div>
