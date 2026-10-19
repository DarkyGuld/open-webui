<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { WEBUI_API_BASE_URL } from '$lib/constants';
	import { user, showSidebar } from '$lib/stores';
	import { formatFileSize } from '$lib/utils';
	import SidebarIcon from '$lib/components/icons/Sidebar.svelte';
	import BookOpen from '$lib/components/icons/BookOpen.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import FileTypeIcon from '$lib/components/chat/FileNav/FileTypeIcon.svelte';
	import ReadOnlyPreview from './ReadOnlyPreview.svelte';
	import {
		createLibraryApi,
		LibraryError,
		type LibraryFile,
		type FileKind
	} from '$lib/library/files';

	const i18n = getContext<typeof import('$lib/i18n').default>('i18n');
	const api = createLibraryApi(WEBUI_API_BASE_URL);
	const kinds = ['all', 'image', 'video', 'document', 'audio', 'other'] as const;
	let kind: FileKind | 'all' = 'all';
	let sort: 'newest' | 'name' = 'newest';
	let query = '';
	let files: LibraryFile[] = [];
	let selected: LibraryFile | null = null;
	let loading = false;
	let errorKey = '';
	let hasMore = false;
	let total: number | null = null;
	let currentPage = 0;
	let rowsSeen = 0;
	let requestId = 0;
	let controller: AbortController | undefined;
	let debounce: ReturnType<typeof setTimeout>;
	let mounted = false;
	let owner: string | undefined;
	let searchKey = '';
	$: filtered = files
		.filter((f) => kind === 'all' || f.kind === kind)
		.slice()
		.sort((a, b) =>
			sort === 'name' ? a.name.localeCompare(b.name) : (b.createdAt ?? 0) - (a.createdAt ?? 0)
		);
	$: key = JSON.stringify([$user?.id ?? '', query.trim()]);
	$: if (mounted && key !== searchKey) {
		searchKey = key;
		controller?.abort();
		++requestId; // invalidate the old response immediately, before the debounce
		clearTimeout(debounce);
		files = [];
		selected = null;
		errorKey = '';
		hasMore = false;
		total = null;
		loading = true;
		owner = $user?.id;
		debounce = setTimeout(() => void load(true), 250);
	}

	async function load(reset: boolean) {
		clearTimeout(debounce);
		if (!$user?.id) {
			loading = false;
			return;
		}
		const nextPage = reset ? 1 : currentPage + 1;
		const id = ++requestId;
		controller?.abort();
		controller = new AbortController();
		loading = true;
		errorKey = '';
		if (reset) {
			files = [];
			selected = null;
			hasMore = false;
			total = null;
			currentPage = 0;
			rowsSeen = 0;
		}
		try {
			const result = await api.list(
				localStorage.token,
				query,
				nextPage,
				controller.signal,
				rowsSeen
			);
			if (id !== requestId || $user?.id !== owner) return;
			const seen = new Set(reset ? [] : files.map((f) => f.id));
			const fresh = result.items.filter((f) => {
				if (seen.has(f.id)) return false;
				seen.add(f.id);
				return true;
			});
			files = [...(reset ? [] : files), ...fresh];
			currentPage = nextPage;
			rowsSeen += result.rows;
			hasMore = result.hasMore;
			total = result.total;
		} catch (error) {
			if (id !== requestId || controller.signal.aborted) return;
			errorKey =
				error instanceof LibraryError && error.code === 'denied'
					? 'library.accessDenied'
					: 'library.loadError';
		} finally {
			if (id === requestId) loading = false;
		}
	}
	onMount(() => {
		mounted = true;
		return () => {
			mounted = false;
			++requestId;
			clearTimeout(debounce);
			controller?.abort();
		};
	});
</script>

<div class="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-5">
	<header class="mb-5 flex items-start gap-3">
		<button
			type="button"
			class="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 dark:hover:bg-gray-900"
			aria-label={$i18n.t('Open Sidebar')}
			on:click={() => showSidebar.set(!$showSidebar)}
		>
			<SidebarIcon className="size-5" />
		</button>
		<div class="min-w-0 flex-1">
			<h1 class="text-xl font-medium text-gray-900 dark:text-gray-100">
				{$i18n.t('library.title')}
			</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{$i18n.t('library.description')}</p>
		</div>
	</header>
	<div class="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
		<label class="min-w-0">
			<span class="sr-only">{$i18n.t('library.search')}</span>
			<input
				type="search"
				bind:value={query}
				maxlength="200"
				placeholder={$i18n.t('library.search')}
				class="min-h-11 w-full rounded-xl border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus-visible:outline focus-visible:outline-2 dark:border-gray-800 dark:text-gray-100"
			/>
		</label>
		<label>
			<span class="sr-only">{$i18n.t('library.fileType')}</span>
			<select
				bind:value={kind}
				class="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 focus-visible:outline focus-visible:outline-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
			>
				{#each kinds as k}<option value={k}>{$i18n.t(`library.kind.${k}`)}</option>{/each}
			</select>
		</label>
		<label>
			<span class="sr-only">{$i18n.t('library.sort')}</span>
			<select
				bind:value={sort}
				class="min-h-11 w-full min-w-40 rounded-xl border border-gray-200 bg-white py-2 ps-3 pe-8 text-sm text-gray-700 focus-visible:outline focus-visible:outline-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
			>
				<option value="newest">{$i18n.t('library.newest')}</option><option value="name"
					>{$i18n.t('Filename')}</option
				>
			</select>
		</label>
		<button
			type="button"
			disabled={loading}
			on:click={() => load(true)}
			class="min-h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 disabled:opacity-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
			>{$i18n.t('Refresh')}</button
		>
	</div>
	<p class="mb-4 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
		{$i18n.t('library.loadedCount', { count: files.length })}{total !== null ? ` / ${total}` : ''}
		<span class="ms-2">{$i18n.t('library.loadedPolicy')}</span>
	</p>
	{#if errorKey}
		<div
			role="alert"
			class="mb-4 rounded-xl border border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300"
		>
			<p>{$i18n.t(errorKey)}</p>
			<button
				type="button"
				class="mt-3 min-h-11 rounded-xl border border-gray-200 px-4 focus-visible:outline focus-visible:outline-2 dark:border-gray-700"
				on:click={() => load(files.length === 0)}>{$i18n.t('Retry')}</button
			>
		</div>
	{/if}
	{#if filtered.length}
		<ul
			class="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
			aria-label={$i18n.t('library.fileList')}
		>
			{#each filtered as file (file.id)}
				<li class="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
					<button
						type="button"
						aria-label={$i18n.t('library.previewFile', { name: file.name })}
						class="flex min-h-16 w-full items-center gap-3 p-3 text-start transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:hover:bg-gray-900"
						on:click={() => (selected = file)}
					>
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900"
						>
							<FileTypeIcon name={file.name} size={20} />
						</div>
						<div class="min-w-0 flex-1">
							<div
								class="truncate text-sm font-medium text-gray-800 dark:text-gray-100"
								title={file.name}
							>
								{file.name}
							</div>
							<div class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
								{$i18n.t(`library.kind.${file.kind}`)}
							</div>
						</div>
						<div class="shrink-0 text-end text-xs text-gray-500 dark:text-gray-400">
							<div>{file.size === null ? '—' : formatFileSize(file.size)}</div>
							{#if file.createdAt !== null}<time
									datetime={new Date(file.createdAt * 1000).toISOString()}
									class="mt-1 block"
									>{new Date(file.createdAt * 1000).toLocaleDateString($i18n.language)}</time
								>{/if}
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{:else if !loading && !errorKey}
		<div
			class="rounded-xl border border-dashed border-gray-200 px-4 py-12 text-center dark:border-gray-800"
			role="status"
		>
			<div class="mb-3 flex justify-center text-gray-400"><BookOpen className="size-7" /></div>
			<p class="text-sm font-medium text-gray-700 dark:text-gray-200">
				{$i18n.t(query || kind !== 'all' ? 'library.noMatches' : 'library.empty')}
			</p>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{$i18n.t(
					hasMore
						? 'library.moreToSearch'
						: query || kind !== 'all'
							? 'library.tryOtherFilter'
							: 'library.emptyHint'
				)}
			</p>
		</div>
	{/if}
	{#if loading}<div
			role="status"
			class="flex items-center justify-center gap-2 py-8 text-sm text-gray-500"
		>
			<Spinner className="size-5" />{$i18n.t('Loading...')}
		</div>{/if}
	{#if hasMore && !errorKey}<div class="mt-4 text-center">
			<button
				type="button"
				disabled={loading}
				on:click={() => load(false)}
				class="min-h-11 rounded-xl border border-gray-200 px-5 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 disabled:opacity-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
				>{$i18n.t('Load more')}</button
			>
		</div>{/if}
</div>

{#if selected}
	{#key selected.id}<ReadOnlyPreview file={selected} onClose={() => (selected = null)} />{/key}
{/if}
