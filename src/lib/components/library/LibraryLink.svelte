<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/stores';
	import { mobile, showSidebar } from '$lib/stores';
	import BookOpen from '$lib/components/icons/BookOpen.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	const i18n = getContext<typeof import('$lib/i18n').default>('i18n');
	export let compact = false;
	$: active = $page.url.pathname === '/library';
</script>

<Tooltip content={$i18n.t('library.title')} placement={compact ? 'right' : 'bottom'}>
	<a
		href="/library"
		aria-label={$i18n.t('library.title')}
		aria-current={active ? 'page' : undefined}
		class="flex items-center gap-2 rounded-xl text-gray-700 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-gray-300 dark:hover:bg-gray-900 {compact ? 'size-8 justify-center' : 'min-h-11 w-full px-2 py-1.5'} {active ? 'bg-black/[0.035] dark:bg-white/[0.045]' : ''}"
		on:click={(e) => { e.stopPropagation(); if ($mobile) showSidebar.set(false); }}
	>
		<BookOpen className="size-4 shrink-0" strokeWidth="1.5" />
		{#if !compact}<span class="text-[0.8125rem] leading-5">{$i18n.t('library.title')}</span>{/if}
	</a>
</Tooltip>
