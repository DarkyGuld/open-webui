/**
 * Shared lifecycle for binding an allow-listed query (queries.ts) into a
 * component. This is NOT a second data-binding mechanism — every component uses
 * the same `runQuery` registry; this only factors the idle/loading/success/error
 * transitions and the typed derivations (chart/timeline/progress) so components
 * stay small and consistent.
 */
import { runQuery, isKnownQuery, type QueryResult } from './queries';

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QueryBinding {
	status: QueryStatus;
	result: QueryResult | null;
	error: string;
}

export function emptyBinding(): QueryBinding {
	return { status: 'idle', result: null, error: '' };
}

function token(): string {
	return typeof localStorage !== 'undefined' ? localStorage.token : '';
}

/**
 * Run an allow-listed query, reporting lifecycle transitions via `onUpdate`.
 * Unknown source → safe error state (never throws to the caller).
 */
export async function loadBoundQuery(
	source: string,
	onUpdate: (b: QueryBinding) => void
): Promise<QueryBinding> {
	if (!isKnownQuery(source)) {
		const b: QueryBinding = { status: 'error', result: null, error: 'unknown query' };
		onUpdate(b);
		return b;
	}
	onUpdate({ status: 'loading', result: null, error: '' });
	try {
		const result = await runQuery(source, token());
		const b: QueryBinding = { status: 'success', result, error: '' };
		onUpdate(b);
		return b;
	} catch (e) {
		const b: QueryBinding = { status: 'error', result: null, error: (e as Error).message };
		onUpdate(b);
		return b;
	}
}

/**
 * column 0 → labels; remaining numeric columns → named series. Columns with no
 * finite numeric value at all (e.g. a text column) are dropped so the chart
 * only plots real numbers.
 */
export function chartDataFromQuery(result: QueryResult): {
	labels: string[];
	series: { name: string; values: number[] }[];
} {
	const labels = result.rows.map((r) => String(r[0] ?? ''));
	const series = result.columns
		.slice(1)
		.map((name, ci) => {
			const nums = result.rows.map((r) => Number(r[ci + 1]));
			return { name: String(name), nums, hasNumeric: nums.some((n) => Number.isFinite(n)) };
		})
		.filter((s) => s.hasNumeric)
		.map((s) => ({ name: s.name, values: s.nums.map((n) => (Number.isFinite(n) ? n : 0)) }));
	return { labels, series };
}

/** [title, timestamp, description, status] per row. */
export function timelineFromQuery(result: QueryResult): {
	title: string;
	timestamp?: string;
	description?: string;
	status?: 'done' | 'active' | 'pending' | 'error';
}[] {
	const statuses = ['done', 'active', 'pending', 'error'] as const;
	return result.rows.map((r) => {
		const raw = String(r[3] ?? '');
		const status = (statuses as readonly string[]).includes(raw) ? (raw as any) : undefined;
		return {
			title: String(r[0] ?? ''),
			...(r[1] != null && String(r[1]) !== '' ? { timestamp: String(r[1]) } : {}),
			...(r[2] != null && String(r[2]) !== '' ? { description: String(r[2]) } : {}),
			...(status ? { status } : {})
		};
	});
}

/** First finite numeric cell (used to derive a scalar, e.g. a progress value). */
export function firstNumeric(result: QueryResult): number | null {
	for (const row of result.rows) {
		for (const cell of row) {
			const v = Number(cell);
			if (Number.isFinite(v)) return v;
		}
	}
	return null;
}
