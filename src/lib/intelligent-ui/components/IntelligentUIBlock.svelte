<script lang="ts">
	import { getContext, onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { chatId, user } from '$lib/stores';
	import {
		createIntelligentUIRuntime,
		createIntelligentUIPartialRuntime,
		type IntelligentUIPartialRuntime,
		type IntelligentUIRuntime
	} from '$lib/intelligent-ui/adapter';
	import { dispatchAction, type ActionContext } from '$lib/intelligent-ui/actions';
	import { getMutation } from '$lib/intelligent-ui/mutations';
	import { safeNavigationUrl } from '$lib/intelligent-ui/navigation';
	import {
		createInteractionScope, loadControlState, saveControlState,
		type InteractionScope
	} from '$lib/intelligent-ui/interaction-state';
	import { isTemporaryChatId } from '$lib/utils/chatId';
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
	let partialRt: IntelligentUIPartialRuntime | undefined = undefined;
	let fallbackReason: string | null = null;
	let unsub: (() => void) | undefined;
	let lastKey: string | null = null;
	let scope: InteractionScope | null = null;
	let userEdits = 0;
	let disposed = false;
	let selected: string | undefined = undefined;

	// Re-parse when the fence content (or completion) changes.
	// - partial: ONE persistent streaming runtime (parser + store reused across
	//   chunks; user input survives between chunks) — keep last-good tree.
	// - complete: full parse + live runtime, seeded with the user-touched values
	//   from streaming so interactions survive the finalization.
	$: identity = JSON.stringify([$user?.id ?? '', $chatId ?? '', id]);
	let lastIdentity = '';
	$: key = `${identity}:${partial ? 'p' : 'f'}:${token?.text ?? ''}`;
	$: if (key !== lastKey) {
		if (identity !== lastIdentity) {
			partialRt?.dispose();
			partialRt = undefined;
			unsub?.();
			runtime = undefined;
			tree = null;
			selected = undefined;
			lastIdentity = identity;
		}
		scope = null;
		lastKey = key;
		const input = { version: token?.attributes?.v, content: token?.text ?? '' };
		if (partial) {
			if (!partialRt) partialRt = createIntelligentUIPartialRuntime();
			const p = partialRt.update(input);
			if (p.ok && p.node) tree = p.node; // keep last-good tree on failure
		} else {
			const touched = partialRt?.touchedValues();
			partialRt?.dispose();
			partialRt = undefined;
			unsub?.();
			unsub = undefined;
			const outcome = createIntelligentUIRuntime(
				input,
				undefined,
				touched ? { persisted: touched } : undefined
			);
			if (outcome.ok) {
				tree = outcome.node;
				runtime = outcome.runtime;
				fallbackReason = null;
				if (runtime) {
					unsub = runtime.subscribe(() => {
						tree = runtime!.evaluate();
					});
					// User input during this stream wins over any saved state.
					void restoreInteractionState(key, !!touched && Object.keys(touched).length > 0);
				}
			} else {
				tree = null;
				runtime = undefined;
				fallbackReason = outcome.reason;
			}
		}
	}

	// Deliberately local-only first slice. No raw text fields or model context.
	async function restoreInteractionState(keyAtLoad: string, streamingInput: boolean) {
		const chat = $chatId ?? '';
		if (!chat || !id || isTemporaryChatId(chat)) return;
		const rt = runtime;
		const editsAtLoad = userEdits;
		try {
			const resolved = await createInteractionScope($user?.id ?? '', chat, id, token?.text ?? '');
			if (disposed || key !== keyAtLoad || runtime !== rt || !resolved || !tree || !rt) return;
			scope = resolved;
			if (!streamingInput && userEdits === editsAtLoad) {
				const saved = loadControlState(scope, tree);
				for (const [name, value] of Object.entries(saved)) {
					if (name === '_selection') selected = value as string;
					else rt.setState(name, value);
				}
				tree = rt.evaluate();
			} else {
				persistInteractionState();
			}
		} catch {
			// Crypto/storage unavailable: keep working entirely in memory.
		}
	}

	function persistInteractionState() {
		if (partialRt || !runtime || !tree || !scope) return;
		saveControlState(scope, tree, { ...runtime.getState(), _selection: selected });
	}

	onDestroy(() => {
		disposed = true;
		unsub?.();
		partialRt?.dispose();
	});

	// --- native confirmation ---
	let confirmOpen = false;
	let confirmMessage = '';
	let confirmResolve: ((v: boolean) => void) | null = null;
	// Prevents double-submit while a mutation is executing.
	let mutationBusy = false;
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
			userEdits++;
			persistInteractionState();
		}
		if (!result.ok && result.reason !== 'cancelled') {
			console.debug('[intelligent-ui] action rejected:', result.reason);
		}
	}

	function refreshPartialTree() {
		if (!partialRt) return false;
		const r = partialRt.refresh();
		if (r.ok && r.node) {
			tree = r.node;
			return true;
		}
		return false;
	}

	function handleBind(name: string, value: unknown) {
		userEdits++;
		if (partialRt) {
			// Live binding during streaming — recorded in the persistent store
			// and carried into the final runtime at completion.
			partialRt.setState(name, value);
			refreshPartialTree();
			return;
		}
		runtime?.setState(name, value);
		tree = runtime?.evaluate() ?? tree;
		persistInteractionState();
	}

	// OpenUI actions (@Set / @Reset / @ToAssistant / @OpenUrl), already normalized
	// and allow-listed by the engine. No model call.
	async function handleOpenUIAction(action: OpenUIAction | OpenUIAction[]) {
		const steps = Array.isArray(action) ? action : [action];
		for (const step of steps) {
			if (step.type === 'set') {
				userEdits++;
				if (partialRt) partialRt.setState(step.target, step.value);
				else runtime?.setState(step.target, step.value);
			} else if (step.type === 'reset') {
				userEdits++;
				if (partialRt) partialRt.resetState(step.targets);
				else runtime?.resetState(step.targets);
			} else if (step.type === 'send_prompt') {
				window.postMessage(
					{ type: 'input:prompt:submit', text: step.prompt },
					window.location.origin
				);
			} else if (step.type === 'open_url') {
				const url = safeNavigationUrl(step.url);
				if (!url) continue;
				const approved = await confirm({ message: url });
				if (approved) window.open(url, '_blank', 'noopener,noreferrer');
			} else if (step.type === 'run') {
				// Registered mutation only; unknown id is rejected. Runs solely from a
				// user click (never on render/reload), after native confirmation.
				const mutation = getMutation(step.id);
				if (!mutation) {
					console.debug('[intelligent-ui] unknown mutation id:', step.id);
					continue;
				}
				if (mutationBusy) continue; // prevent double-submit
				const approved = await confirm({ message: mutation.description(step.args) });
				if (!approved) continue;
				mutationBusy = true;
				try {
					const token = typeof localStorage !== 'undefined' ? localStorage.token : '';
					// Clear idle -> executing -> success/error feedback loop.
					const run = mutation.run(token, step.args);
					toast.promise(run, {
						loading: $i18n.t('Saving…'),
						success: mutation.title ?? $i18n.t('Done'),
						error: $i18n.t('Could not complete the action')
					});
					await run;
				} catch {
					// failure is surfaced by the toast; keep the UI stable
				} finally {
					mutationBusy = false;
				}
			}
		}
		if (partialRt) refreshPartialTree();
		else {
			tree = runtime?.evaluate() ?? tree;
			persistInteractionState();
		}
	}
</script>

{#if tree}
	<div class="my-3">
		<NodeRenderer
			node={tree}
			onAction={handleAction}
			{selected}
			onBind={handleBind}
			onOpenUIAction={handleOpenUIAction}
		/>
	</div>
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
