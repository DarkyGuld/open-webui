<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { WEBUI_API_BASE_URL } from '$lib/constants';
	import { user } from '$lib/stores';
	import Modal from '$lib/components/common/Modal.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import {
		createLibraryApi,
		MAX_TEXT_CHARACTERS,
		LibraryError,
		type LibraryFile,
		type PreviewKind
	} from '$lib/library/files';
	import type { ComponentType } from 'svelte';
	const i18n = getContext<typeof import('$lib/i18n').default>('i18n');
	export let file: LibraryFile;
	export let onClose: () => void;
	const api = createLibraryApi(WEBUI_API_BASE_URL);
	let state: 'loading' | 'ready' | 'error' = 'loading';
	let kind: PreviewKind = 'unsupported';
	let src = '';
	let text = '';
	let pdfData: ArrayBuffer | null = null;
	let Pdf: ComponentType | null = null;
	let truncated = false;
	let errorKey = 'library.previewError';
	let controller: AbortController;
	let generation = 0;
	let destroyed = false;
	let owner = '';
	function release() {
		if (src) URL.revokeObjectURL(src);
		src = '';
		pdfData = null;
		text = '';
	}
	async function load() {
		const current = ++generation;
		controller?.abort();
		controller = new AbortController();
		release();
		state = 'loading';
		try {
			const result = await api.preview(localStorage.token, file.id, controller.signal);
			if (current !== generation || destroyed) return;
			kind = result.kind;
			if (result.blob) {
				if (kind === 'text') {
					const value = await result.blob.text();
					if (current !== generation || destroyed) return;
					truncated = value.length > MAX_TEXT_CHARACTERS;
					text = value.slice(0, MAX_TEXT_CHARACTERS);
				} else if (kind === 'pdf') {
					const [module, bytes] = await Promise.all([
						import('$lib/components/common/PDFViewer.svelte'),
						result.blob.arrayBuffer()
					]);
					if (current !== generation || destroyed) return;
					Pdf = module.default;
					pdfData = bytes;
				} else src = URL.createObjectURL(result.blob);
			}
			state = 'ready';
		} catch (error) {
			if (current !== generation || destroyed || controller.signal.aborted) return;
			errorKey =
				error instanceof LibraryError && error.code === 'too-large'
					? 'library.previewTooLarge'
					: error instanceof LibraryError && error.code === 'denied'
						? 'library.accessDenied'
						: 'library.previewError';
			state = 'error';
		}
	}
	function close() {
		++generation;
		controller?.abort();
		release();
		onClose();
	}
	onMount(() => {
		owner = $user?.id ?? '';
		void load();
		return () => {
			destroyed = true;
			++generation;
			controller?.abort();
			release();
		};
	});
	$: if (owner && $user?.id !== owner) close();
</script>

<Modal show={true} size="lg" ariaLabel={$i18n.t('library.previewTitle')} onRequestClose={close}>
	<div class="p-4 sm:p-5">
		<header class="mb-4 flex items-start justify-between gap-3">
			<div class="min-w-0">
				<h2 class="break-all text-base font-medium text-gray-900 dark:text-gray-100">
					{file.name}
				</h2>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{$i18n.t('library.readOnly')}</p>
			</div>
			<button
				type="button"
				class="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 dark:hover:bg-gray-800"
				aria-label={$i18n.t('Close')}
				on:click={close}
			>
				<XMark className="size-5" />
			</button>
		</header>
		{#if state === 'loading'}
			<div
				class="flex min-h-40 items-center justify-center gap-2 text-sm text-gray-500"
				role="status"
			>
				<Spinner className="size-5" />{$i18n.t('Loading...')}
			</div>
		{:else if state === 'error'}
			<div role="alert" class="space-y-3 py-8 text-sm text-gray-600 dark:text-gray-300">
				<p>{$i18n.t(errorKey)}</p>
				<button
					type="button"
					class="min-h-11 rounded-xl border border-gray-200 px-4 focus-visible:outline focus-visible:outline-2 dark:border-gray-700"
					on:click={load}>{$i18n.t('Retry')}</button
				>
			</div>
		{:else if kind === 'image'}
			<img
				{src}
				alt={file.name}
				class="mx-auto max-h-[65dvh] max-w-full rounded-xl object-contain"
				on:error={() => {
					errorKey = 'library.previewError';
					state = 'error';
					release();
				}}
			/>
		{:else if kind === 'video'}
			<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">{$i18n.t('library.noCaptions')}</p>
			<!-- eslint-disable-next-line svelte/no-unused-svelte-ignore -->
			<!-- svelte-ignore a11y_media_has_caption (No caption file is supplied; never fabricate a track.) -->
			<video
				{src}
				controls
				playsinline
				preload="metadata"
				aria-label={file.name}
				class="max-h-[65dvh] w-full rounded-xl"
				on:error={() => {
					errorKey = 'library.previewError';
					state = 'error';
					release();
				}}
			></video>
		{:else if kind === 'audio'}
			<audio
				{src}
				controls
				preload="metadata"
				aria-label={file.name}
				class="w-full"
				on:error={() => {
					errorKey = 'library.previewError';
					state = 'error';
					release();
				}}
			></audio>
		{:else if kind === 'pdf' && Pdf && pdfData}
			<svelte:component this={Pdf} data={pdfData} />
		{:else if kind === 'text'}
			{#if truncated}<p role="status" class="mb-2 text-xs text-gray-500">
					{$i18n.t('library.textTruncated')}
				</p>{/if}
			<pre
				class="max-h-[65dvh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-sm text-gray-800 dark:bg-gray-950 dark:text-gray-200">{text ||
					$i18n.t('No content available')}</pre>
		{:else}
			<p class="py-8 text-sm text-gray-500 dark:text-gray-400">{$i18n.t('library.unsupported')}</p>
		{/if}
	</div>
</Modal>
