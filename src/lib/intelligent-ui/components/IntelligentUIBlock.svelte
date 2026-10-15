<script lang="ts">
	import { getContext, onDestroy } from 'svelte';
	import { chatId } from '$lib/stores';
	import {
		createIntelligentUIRuntime,
		type IntelligentUIRuntime,
		type RuntimeOutcome
	} from '$lib/intelligent-ui/adapter';
	import { dispatchAction, type ActionContext } from '$lib/intelligent-ui/actions';
	import { loadState, saveState } from '$lib/intelligent-ui/state';
	import type { UIAction, UINode } from '$lib/intelligent-ui/types';
	import NodeRenderer from '$lib/intelligent-ui/components/NodeRenderer.svelte';
	import IntelligentUIFallback from '$lib/intelligent-ui/components/IntelligentUIFallback.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';

	const i18n: any = getContext('i18n');

	export let token: any;
	export let done: boolean = true;
	export let id: string = '';

	$: outcome = createIntelligentUIRuntime({
		version: token?.attributes?.v,
		content: token?.text ?? ''
	});

	let tree: UINode | null = null;
	let runtime: IntelligentUIRuntime | undefined = undefined;
	let unsub: (() => void) | undefined;
	let lastOutcome: RuntimeOutcome | null = null;

	// (Re)initialise the runtime + subscribe to state changes when the parse outcome changes.
	$: if (outcome !== lastOutcome) {
		unsub?.();
		lastOutcome = outcome;
		if (outcome.ok) {
			tree = outcome.node;
			runtime = outcome.runtime;
			if (runtime) {
				unsub = runtime.subscribe(() => {
					tree = runtime!.evaluate();
				});
			}
		} else {
			tree = null;
			runtime = undefined;
		}
	}

	onDestroy(() => unsub?.());

	// --- durable local state (comparison selection) ---
	let uiState: Record<string, unknown> = loadState($chatId ?? '', id);
	let selected: string | undefined = typeof uiState.selected === 'string' ? uiState.selected : undefined;

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

	function handleBind(name: string, value: unknown) {
		runtime?.setState(name, value);
		tree = runtime?.evaluate() ?? tree;
	}
</script>

{#if tree}
	<NodeRenderer node={tree} onAction={handleAction} {selected} onBind={handleBind} />
{:else if !outcome.ok}
	<IntelligentUIFallback content={token?.text ?? ''} reason={outcome.reason} />
{/if}

<ConfirmDialog
	bind:show={confirmOpen}
	title={$i18n.t('Confirm')}
	message={confirmMessage}
	onConfirm={() => resolveConfirm(true)}
	on:cancel={() => resolveConfirm(false)}
/>
