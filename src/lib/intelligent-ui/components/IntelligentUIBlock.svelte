<script lang="ts">
	import { getContext, onDestroy } from 'svelte';
	import { chatId } from '$lib/stores';
	import {
		createIntelligentUIRuntime,
		parseIntelligentUIPartial,
		type IntelligentUIRuntime
	} from '$lib/intelligent-ui/adapter';
	import { dispatchAction, type ActionContext } from '$lib/intelligent-ui/actions';
	import { getMutation } from '$lib/intelligent-ui/mutations';
	import { loadState, saveState } from '$lib/intelligent-ui/state';
	import type { OpenUIAction, UIAction, UINode } from '$lib/intelligent-ui/types';
	import NodeRenderer from '$lib/intelligent-ui/components/NodeRenderer.svelte';
	import IntelligentUIFallback from '$lib/intelligent-ui/components/IntelligentUIFallback.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';

	const i18n: any = getContext('i18n');

	export let token: any;
	export let done: boolean = true;
	export let id: string = '';
	export let partial: boolean = false;

	let tree: UINode | null = null;
	let runtime: IntelligentUIRuntime | undefined = undefined;
	let fallbackReason: string | null = null;
	let unsub: (() => void) | undefined;
	let lastKey: string | null = null;

	// Re-parse when the fence content (or completion) changes.
	// - partial: progressive render via the streaming parser; keep last-good tree.
	// - complete: full parse + live runtime (two-way binding).
	$: key = `${partial ? 'p' : 'f'}:${token?.text ?? ''}`;
	$: if (key !== lastKey) {
		lastKey = key;
		const input = { version: token?.attributes?.v, content: token?.text ?? '' };
		if (partial) {
			const p = parseIntelligentUIPartial(input);
			if (p.ok) tree = p.node; // keep last-good tree on failure
		} else {
			unsub?.();
			unsub = undefined;
			const outcome = createIntelligentUIRuntime(input);
			if (outcome.ok) {
				tree = outcome.node;
				runtime = outcome.runtime;
				fallbackReason = null;
				if (runtime) {
					unsub = runtime.subscribe(() => {
						tree = runtime!.evaluate();
					});
				}
			} else {
				tree = null;
				runtime = undefined;
				fallbackReason = outcome.reason;
			}
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

	// OpenUI actions (@Set / @Reset / @ToAssistant / @OpenUrl), already normalized
	// and allow-listed by the engine. No model call.
	async function handleOpenUIAction(action: OpenUIAction | OpenUIAction[]) {
		const steps = Array.isArray(action) ? action : [action];
		for (const step of steps) {
			if (step.type === 'set') {
				runtime?.setState(step.target, step.value);
			} else if (step.type === 'reset') {
				runtime?.resetState(step.targets);
			} else if (step.type === 'send_prompt') {
				window.postMessage(
					{ type: 'input:prompt:submit', text: step.prompt },
					window.location.origin
				);
			} else if (step.type === 'open_url') {
				const approved = await confirm({ message: step.url });
				if (approved) window.open(step.url, '_blank', 'noopener');
			} else if (step.type === 'run') {
				// Registered mutation only; unknown id is rejected. Runs solely from a
				// user click (never on render/reload), after native confirmation.
				const mutation = getMutation(step.id);
				if (!mutation) {
					console.debug('[intelligent-ui] unknown mutation id:', step.id);
					continue;
				}
				const approved = await confirm({ message: mutation.description(step.args) });
				if (!approved) continue;
				try {
					const token = typeof localStorage !== 'undefined' ? localStorage.token : '';
					await mutation.run(token, step.args);
				} catch (e) {
					console.debug('[intelligent-ui] mutation failed:', (e as Error).message);
				}
			}
		}
		tree = runtime?.evaluate() ?? tree;
	}
</script>

{#if tree}
	<NodeRenderer
		node={tree}
		onAction={handleAction}
		{selected}
		onBind={handleBind}
		onOpenUIAction={handleOpenUIAction}
	/>
{:else if !partial && fallbackReason !== null}
	<IntelligentUIFallback content={token?.text ?? ''} reason={fallbackReason} />
{/if}

<ConfirmDialog
	bind:show={confirmOpen}
	title={$i18n.t('Confirm')}
	message={confirmMessage}
	onConfirm={() => resolveConfirm(true)}
	on:cancel={() => resolveConfirm(false)}
/>
