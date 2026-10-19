<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { settings } from '$lib/stores';
	import BookOpen from '$lib/components/icons/BookOpen.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	const i18n = getContext<typeof import('$lib/i18n').default>('i18n');
	export let compact = false;
	/** Native sidebar navigation side effects (clear chat state, close mobile sidebar). */
	export let onNavigate: (() => void) | null = null;
	$: active = $page.url.pathname === '/library';
	$: activeClass =
		($settings?.highContrastMode ?? false)
			? 'bg-black/[0.035] dark:bg-white/[0.06]'
			: 'bg-black/[0.035] dark:bg-white/[0.045]';
</script>

{#if compact}
	<Tooltip content={$i18n.t('library.title')} placement="right">
		<a
			class=" cursor-pointer flex size-8 items-center justify-center transition group"
			href="/library"
			on:click={(e) => {
				e.stopImmediatePropagation();
				e.preventDefault();
				goto('/library');
				onNavigate?.();
			}}
			draggable="false"
			aria-label={$i18n.t('library.title')}
			aria-current={active ? 'page' : undefined}
		>
			<div
				class="self-center flex size-[calc(30px*var(--app-text-scale,1))] items-center justify-center rounded-lg transition {active
					? activeClass
					: 'group-hover:bg-gray-100 dark:group-hover:bg-gray-900'}"
			>
				<BookOpen className="size-4" strokeWidth="1.5" />
			</div>
		</a>
	</Tooltip>
{:else}
	<a
		id="sidebar-library-button"
		class="grow flex items-center space-x-2 rounded-xl px-2 py-1.5 transition {active
			? activeClass
			: 'hover:bg-gray-100 dark:hover:bg-gray-900'}"
		href="/library"
		on:click={() => onNavigate?.()}
		draggable="false"
		aria-label={$i18n.t('library.title')}
		aria-current={active ? 'page' : undefined}
	>
		<div class="self-center flex size-4 shrink-0 items-center justify-center">
			<BookOpen className="size-4" strokeWidth="1.5" />
		</div>
		<div class="flex self-center translate-y-[0.5px]">
			<div class=" self-center text-[0.8125rem] leading-5">{$i18n.t('library.title')}</div>
		</div>
	</a>
{/if}
