import { describe, it, expect, vi } from 'vitest';
import { validateAction, actionRisk, dispatchAction } from '../actions';

describe('intelligent-ui actions — allow-list', () => {
	it('accepts allow-listed actions', () => {
		expect(validateAction({ type: 'send_prompt', prompt: 'hi' }).ok).toBe(true);
		expect(validateAction({ type: 'select', value: 'a' }).ok).toBe(true);
		expect(validateAction({ type: 'toggle', value: true }).ok).toBe(true);
		expect(validateAction({ type: 'set_value', value: 1 }).ok).toBe(true);
		expect(validateAction({ type: 'confirm' }).ok).toBe(true);
	});

	it('rejects unknown or malformed actions', () => {
		expect(validateAction({ type: 'run_js', code: 'x' }).ok).toBe(false);
		expect(validateAction({ type: 'send_prompt' }).ok).toBe(false);
		expect(validateAction(null).ok).toBe(false);
		expect(validateAction('nope').ok).toBe(false);
	});

	it('classifies risk levels', () => {
		expect(actionRisk({ type: 'send_prompt', prompt: 'x' })).toBe('safe');
		expect(actionRisk({ type: 'select', value: 'x' })).toBe('safe');
		expect(actionRisk({ type: 'confirm' })).toBe('confirm');
	});
});

describe('intelligent-ui actions — dispatcher', () => {
	it('dispatches send_prompt via the host', async () => {
		const sendPrompt = vi.fn();
		const r = await dispatchAction({ type: 'send_prompt', prompt: 'go' }, { sendPrompt, confirm: vi.fn() });
		expect(r).toMatchObject({ ok: true, kind: 'host' });
		expect(sendPrompt).toHaveBeenCalledWith('go');
	});

	it('returns state actions to the caller', async () => {
		const r = await dispatchAction({ type: 'select', value: 'pro' }, { sendPrompt: vi.fn(), confirm: vi.fn() });
		expect(r).toMatchObject({ ok: true, kind: 'state' });
	});

	it('requires confirmation and honors cancel', async () => {
		const sendPrompt = vi.fn();
		const r = await dispatchAction({ type: 'confirm', prompt: 'ok?' }, { sendPrompt, confirm: async () => false });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.reason).toBe('cancelled');
	});

	it('proceeds after approval', async () => {
		const r = await dispatchAction({ type: 'confirm', prompt: 'ok?' }, { sendPrompt: vi.fn(), confirm: async () => true });
		expect(r.ok).toBe(true);
	});

	it('rejects invalid actions at dispatch', async () => {
		const r = await dispatchAction({ type: 'evil' }, { sendPrompt: vi.fn(), confirm: vi.fn() });
		expect(r.ok).toBe(false);
	});
});
