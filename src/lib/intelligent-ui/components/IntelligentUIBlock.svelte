<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { chatId } from '$lib/stores';
	import { parseIntelligentUI } from '$lib/intelligent-ui/adapter';
	import { dispatchAction, type ActionContext } from '$lib/intelligent-ui/actions';
	import { loadState, saveState } from '$lib/intelligent-ui/state';
	import type { UIAction } from '$lib/intelligent-ui/types';
	import Metric from '$lib/intelligent-ui/components/Metric.svelte';
	import Comparison from '$lib/intelligent-ui/components/Comparison.svelte';
	import Table from '$lib/intelligent-ui/components/Table.svelte';
	import IntelligentUIFallback from '$lib/intelligent-ui/components/IntelligentUIFallback.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';

	const i18n: any = getContext('i18n');

	export let token: any;
	export let done: boolean = true;
	export let id: string = '';

	$: outcome = parseIntelligentUI({
		version: token?.attributes?.v,
		content: token?.text ?? ''
	});

	// --- durable local state (selection etc.) ---
	let uiState: Record<string, unknown> = {};
	let selected: string | undefined = undefined;
	onMount(() => {
		uiState = loadState($chatId ?? '', id);
		if (typeof uiState.selected === 'string') selected = uiState.selected;
	});

	// --- native confirmation ---
	let confirmOpen = false;
	let confirmMessage = '';
	let confirmResolve: ((v: boolean) => void) | null = null;
	function confirm(opts: { title?: string; message?: string }): Promise<boolean> {
		confirmMessage = opts.message ?? '';
		confirmOpen = true;
		return new Promise((resolve) => (confirmResolve = resolve));
	}
	function resolveConfirm(v: boolean) {
		confirmOpen = false;
		confirmResolve?.(v);
		confirmResolve = null;
	}

	const ctx: ActionContext = {
		sendPrompt: async (prompt: string) => {
			// Reuse Open WebUI's existing same-origin prompt-submit channel.
			window.postMessage({ type: 'input:prompt:submit', text: prompt }, window.location.origin);
		},
		confirm
	};

	async function handleAction(action: UIAction | undefined) {
		if (!action) return;
		const result = await dispatchAction(action, ctx);
		if (result.ok && result.kind === 'state' && result.action.type === 'select') {
			selected = result.action.value;
			uiState = { ...uiState, selected };
			saveState($chatId ?? '', id, uiState);
		}
		if (!result.ok && result.reason !== 'cancelled') {
			console.debug('[intelligent-ui] action rejected:', result.reason);
		}
	}
</script>

{#if outcome.ok}
	{#if outcome.node.type === 'metric'}
		<Metric
			label={outcome.node.label}
			value={outcome.node.value}
			description={outcome.node.description}
			action={outcome.node.action}
			onAction={handleAction}
		/>
	{:else if outcome.node.type === 'comparison'}
		<Comparison
			title={outcome.node.title}
			items={outcome.node.items}
			selectable={outcome.node.selectable ?? false}
			action={outcome.node.action}
			{selected}
			onAction={handleAction}
		/>
	{:else if outcome.node.type === 'table'}
		<Table
			title={outcome.node.title}
			columns={outcome.node.columns}
			rows={outcome.node.rows}
			action={outcome.node.action}
			onAction={handleAction}
		/>
	{/if}
{:else}
	<IntelligentUIFallback content={token?.text ?? ''} reason={outcome.reason} />
{/if}

<ConfirmDialog
	bind:show={confirmOpen}
	title={$i18n.t('Confirm')}
	message={confirmMessage}
	onConfirm={() => resolveConfirm(true)}
	on:cancel={() => resolveConfirm(false)}
/>
