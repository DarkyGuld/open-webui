/**
 * Central Intelligent UI action dispatcher.
 *
 * ALL component interactions go through here: schema validation → allow-list →
 * risk classification → optional native confirmation → execution. Components do
 * not implement their own action handling.
 */
import { actionSchema } from './action-schema';
import type { UIAction } from './types';

export type ActionRisk = 'safe' | 'confirm' | 'forbidden';

export const ACTION_ALLOWLIST = ['send_prompt', 'select', 'toggle', 'set_value', 'confirm'] as const;

export function actionRisk(action: UIAction): ActionRisk {
	switch (action.type) {
		case 'send_prompt':
		case 'select':
		case 'toggle':
		case 'set_value':
			return 'safe';
		case 'confirm':
			return 'confirm';
		default:
			return 'forbidden';
	}
}

export type ValidateActionResult = { ok: true; action: UIAction } | { ok: false; reason: string };

/** Validate + allow-list an action payload. */
export function validateAction(input: unknown): ValidateActionResult {
	const parsed = actionSchema.safeParse(input);
	if (!parsed.success) return { ok: false, reason: 'invalid action payload' };
	const action = parsed.data as UIAction;
	if (actionRisk(action) === 'forbidden') return { ok: false, reason: 'forbidden action' };
	return { ok: true, action };
}

export interface ActionContext {
	/** Send a normal user follow-up prompt through the chat pipeline. */
	sendPrompt: (prompt: string) => void | Promise<void>;
	/** Show a native confirmation dialog; resolves true if approved. */
	confirm: (opts: { title?: string; message?: string }) => Promise<boolean>;
	/** Optional: open an external link (requires confirmation upstream). */
	openLink?: (url: string) => void | Promise<void>;
}

export type DispatchResult =
	| { ok: true; kind: 'host' | 'state'; action: UIAction }
	| { ok: false; reason: string };

/**
 * Dispatch a (possibly untrusted) action. State actions are validated and
 * returned to the caller to apply to component-local state; host actions
 * (send_prompt, confirm) are executed here after any required confirmation.
 */
export async function dispatchAction(input: unknown, ctx: ActionContext): Promise<DispatchResult> {
	const validated = validateAction(input);
	if (!validated.ok) return { ok: false, reason: validated.reason };

	const action = validated.action;

	if (actionRisk(action) === 'confirm') {
		const approved = await ctx.confirm({
			title: 'Confirm',
			message: action.type === 'confirm' ? (action.prompt ?? '') : ''
		});
		if (!approved) return { ok: false, reason: 'cancelled' };
	}

	switch (action.type) {
		case 'send_prompt':
			await ctx.sendPrompt(action.prompt);
			return { ok: true, kind: 'host', action };
		case 'confirm':
			return { ok: true, kind: 'host', action };
		case 'select':
		case 'toggle':
		case 'set_value':
			return { ok: true, kind: 'state', action };
		default:
			return { ok: false, reason: 'unhandled action' };
	}
}
