/**
 * Intelligent UI — host-controlled, allow-listed MUTATION registry.
 *
 * Side-effecting. Each mutation maps to an EXISTING Open WebUI REST endpoint,
 * called with the user's token so Open WebUI's own permission checks apply.
 * Mutations are risk-classified `confirm`: they run ONLY after native host
 * confirmation, and ONLY from an explicit user click (never on render/reload).
 *
 * The model may not supply arbitrary tool names, routes, URLs, or code.
 */

export interface MutationResult {
	message: string;
}

interface MutationDef {
	id: string;
	title: string;
	risk: 'confirm';
	description: (args: Record<string, unknown>) => string;
	run: (token: string, args: Record<string, unknown>) => Promise<MutationResult>;
}

export const mutationRegistry: Record<string, MutationDef> = {
	'notes.create': {
		id: 'notes.create',
		title: 'Create note',
		risk: 'confirm',
		description: (args) => `Create a note titled "${String(args.title ?? 'Untitled')}"?`,
		run: async (token, args) => {
			const res = await fetch('/api/v1/notes/create', {
				method: 'POST',
				headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
				body: JSON.stringify({
					title: String(args.title ?? 'Untitled').slice(0, 200),
					content: String(args.content ?? '').slice(0, 10_000)
				})
			});
			if (!res.ok) throw new Error(`http ${res.status}`);
			return { message: 'Note created.' };
		}
	}
};

export const MUTATION_IDS = Object.keys(mutationRegistry);

export function getMutation(id: string): MutationDef | null {
	return Object.prototype.hasOwnProperty.call(mutationRegistry, id) ? mutationRegistry[id] : null;
}
