<script lang="ts">
	import { getContext } from 'svelte';
	import { WEBUI_NAME, showSidebar } from '$lib/stores';
	import Library from '$lib/components/library/Library.svelte';
	const i18n = getContext<typeof import('$lib/i18n').default>('i18n');
</script>

<svelte:head><title>{$i18n.t('library.title')} · {$WEBUI_NAME}</title></svelte:head>
<div class="h-screen max-h-[100dvh] w-full min-w-0 overflow-y-auto {$showSidebar ? 'md:max-w-[calc(100%-var(--sidebar-width))]' : ''}">
	<Library />
</div>
