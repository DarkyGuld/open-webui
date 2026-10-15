/**
 * Intelligent UI — host-controlled, allow-listed QUERY registry.
 *
 * Read-only. Each query maps to an EXISTING Open WebUI REST endpoint, called with
 * the user's token (same-origin) so Open WebUI's own auth/permission checks apply.
 * No arbitrary URLs, routes, or tool names from the model. Results are normalized
 * to safe serializable {columns, rows}.
 */

export interface QueryResult {
	columns: string[];
	rows: (string | number)[][];
}

interface QueryDef {
	id: string;
	title: string;
	run: (token: string, signal: AbortSignal) => Promise<QueryResult>;
}

export const QUERY_LIMITS = {
	MAX_RESULTS: 50,
	MAX_RESULT_BYTES: 65_536,
	TIMEOUT_MS: 10_000,
	MAX_CONCURRENT: 3,
	MAX_COLUMNS: 12
} as const;

function fmtTime(ts: unknown): string {
	const n = Number(ts);
	if (!n) return '';
	try {
		return new Date(n * 1000).toISOString().slice(0, 10);
	} catch {
		return '';
	}
}

async function getJson(token: string, path: string, signal: AbortSignal): Promise<any> {
	const res = await fetch(path, { headers: { authorization: `Bearer ${token}` }, signal });
	if (!res.ok) throw new Error(`http ${res.status}`);
	return res.json();
}

export const queryRegistry: Record<string, QueryDef> = {
	'conversation.notes': {
		id: 'conversation.notes',
		title: 'Notes',
		run: async (token, signal) => {
			const d = await getJson(token, '/api/v1/notes/', signal);
			const arr: any[] = Array.isArray(d) ? d : (d?.items ?? []);
			return {
				columns: ['Title', 'Updated'],
				rows: arr
					.slice(0, QUERY_LIMITS.MAX_RESULTS)
					.map((n) => [String(n.title ?? ''), fmtTime(n.updated_at)])
			};
		}
	},
	'library.files': {
		id: 'library.files',
		title: 'Files',
		run: async (token, signal) => {
			const d = await getJson(token, '/api/v1/files/', signal);
			const arr: any[] = Array.isArray(d) ? d : (d?.items ?? []);
			return {
				columns: ['Filename', 'Type', 'Bytes'],
				rows: arr
					.slice(0, QUERY_LIMITS.MAX_RESULTS)
					.map((f) => [String(f.filename ?? f.meta?.name ?? ''), String(f.meta?.content_type ?? ''), Number(f.meta?.size ?? 0)])
			};
		}
	},
	'knowledge.collections': {
		id: 'knowledge.collections',
		title: 'Knowledge',
		run: async (token, signal) => {
			const d = await getJson(token, '/api/v1/knowledge/', signal);
			const arr: any[] = Array.isArray(d) ? d : (d?.items ?? []);
			return {
				columns: ['Name', 'Description'],
				rows: arr
					.slice(0, QUERY_LIMITS.MAX_RESULTS)
					.map((k) => [String(k.name ?? ''), String(k.description ?? '')])
			};
		}
	}
};

export const QUERY_IDS = Object.keys(queryRegistry);

let active = 0;

export function isKnownQuery(id: string): boolean {
	return Object.prototype.hasOwnProperty.call(queryRegistry, id);
}

/** Run an allow-listed query with limits + timeout. Unknown id → throws (safe). */
export async function runQuery(id: string, token: string): Promise<QueryResult> {
	const def = queryRegistry[id];
	if (!def) throw new Error('unknown query');
	if (active >= QUERY_LIMITS.MAX_CONCURRENT) throw new Error('too many concurrent queries');
	active++;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), QUERY_LIMITS.TIMEOUT_MS);
	try {
		const result = await def.run(token, controller.signal);
		const bytes = new TextEncoder().encode(JSON.stringify(result)).length;
		if (bytes > QUERY_LIMITS.MAX_RESULT_BYTES) throw new Error('result too large');
		return {
			columns: result.columns.slice(0, QUERY_LIMITS.MAX_COLUMNS),
			rows: result.rows.slice(0, QUERY_LIMITS.MAX_RESULTS)
		};
	} finally {
		clearTimeout(timer);
		active--;
	}
}
