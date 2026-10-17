/** Read-only normalization and preview policy over existing Open WebUI Files APIs. */
export const PAGE_SIZE = 50;
export const MAX_PREVIEW_BYTES = 20 * 1024 * 1024;
export const MAX_TEXT_CHARACTERS = 100_000;
export type FileKind = 'image' | 'video' | 'document' | 'audio' | 'other';
export interface LibraryFile {
	id: string;
	name: string;
	mime: string;
	size: number | null;
	createdAt: number | null;
	kind: FileKind;
}
export interface FilePage { items: LibraryFile[]; total: number | null; hasMore: boolean }

export function validFileId(value: unknown): value is string {
	return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value);
}
export function mimeType(value: unknown): string {
	return typeof value === 'string' ? value.split(';')[0].trim().toLowerCase() : '';
}

export function fileKind(mime: string, filename: string): FileKind {
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('video/')) return 'video';
	if (mime.startsWith('audio/')) return 'audio';
	if (mime.startsWith('text/') || mime === 'application/pdf' || /officedocument|msword|ms-excel|ms-powerpoint/.test(mime)) return 'document';
	const ext = filename.toLowerCase().split('.').pop() ?? '';
	if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp', 'svg'].includes(ext)) return 'image';
	if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
	if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) return 'audio';
	if (['txt', 'md', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'json', 'html', 'xml'].includes(ext)) return 'document';
	return 'other';
}

export function normalizeFile(value: unknown): LibraryFile | null {
	if (!value || typeof value !== 'object') return null;
	const raw = value as Record<string, unknown>;
	if (!validFileId(raw.id) || typeof raw.filename !== 'string') return null;
	const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta as Record<string, unknown> : {};
	const mime = mimeType(meta.content_type);
	return {
		id: raw.id, name: raw.filename, mime, kind: fileKind(mime, raw.filename),
		size: typeof meta.size === 'number' && Number.isFinite(meta.size) && meta.size >= 0 ? meta.size : null,
		createdAt: typeof raw.created_at === 'number' && Number.isFinite(raw.created_at) && raw.created_at >= 0 && raw.created_at <= 8.64e12 ? raw.created_at : null
	};
}

export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unsupported';
/** Response MIME, never extension or model metadata, determines the renderer. */
export function previewKind(mime: string): PreviewKind {
	if (['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp'].includes(mime)) return 'image';
	if (['video/mp4', 'video/webm', 'video/ogg'].includes(mime)) return 'video';
	if (['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/flac', 'audio/webm', 'audio/x-wav'].includes(mime)) return 'audio';
	if (mime === 'application/pdf') return 'pdf';
	if (mime.startsWith('text/') || ['application/json', 'application/xml', 'image/svg+xml'].includes(mime)) return 'text';
	return 'unsupported';
}

export class LibraryError extends Error {
	constructor(public code: 'load' | 'denied' | 'too-large' | 'unavailable') { super(code); }
}

/** Independent request injection keeps policy/unit tests offline. All methods GET only. */
export function createLibraryApi(baseUrl: string, request: typeof fetch = fetch) {
	async function get(token: string, path: string, signal?: AbortSignal) {
		return request(`${baseUrl}${path}`, {
			method: 'GET', headers: { authorization: `Bearer ${token}` },
			signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
			redirect: 'error'
		});
	}
	return {
		async list(token: string, query: string, page: number, signal?: AbortSignal): Promise<FilePage> {
			if (!Number.isSafeInteger(page) || page < 1) throw new LibraryError('load');
			const search = query.trim().slice(0, 200);
			const params = new URLSearchParams({ content: 'false' });
			if (search) {
				params.set('filename', `*${search}*`);
				params.set('skip', String((page - 1) * PAGE_SIZE));
				params.set('limit', String(PAGE_SIZE));
			} else params.set('page', String(page));
			const res = await get(token, `/files/${search ? 'search' : ''}?${params}`, signal);
			// The existing filename search API represents no matches as 404.
			if (search && res.status === 404) return { items: [], total: null, hasMore: false };
			if (!res.ok) throw new LibraryError(res.status === 401 || res.status === 403 ? 'denied' : 'load');
			const data = await res.json();
			const rows = Array.isArray(data) ? data : data?.items;
			if (!Array.isArray(rows)) throw new LibraryError('load');
			const total = typeof data?.total === 'number' && Number.isSafeInteger(data.total) && data.total >= 0 ? data.total : null;
			const items = rows.map(normalizeFile).filter((f): f is LibraryFile => f !== null);
			return { items, total, hasMore: total === null ? rows.length >= PAGE_SIZE : (page - 1) * PAGE_SIZE + rows.length < total };
		},
		async preview(token: string, id: string, signal?: AbortSignal) {
			if (!validFileId(id)) throw new LibraryError('unavailable');
			const res = await get(token, `/files/${encodeURIComponent(id)}/content`, signal);
			if (!res.ok) throw new LibraryError(res.status === 401 || res.status === 403 ? 'denied' : 'unavailable');
			const mime = mimeType(res.headers.get('content-type'));
			const kind = previewKind(mime);
			if (kind === 'unsupported') {
				await res.body?.cancel();
				return { kind, blob: null };
			}
			if (Number(res.headers.get('content-length')) > MAX_PREVIEW_BYTES) {
				await res.body?.cancel();
				throw new LibraryError('too-large');
			}
			const reader = res.body?.getReader();
			if (!reader) throw new LibraryError('unavailable');
			const chunks: ArrayBuffer[] = [];
			let size = 0;
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					size += value.byteLength;
					if (size > MAX_PREVIEW_BYTES) {
						await reader.cancel();
						throw new LibraryError('too-large');
					}
					chunks.push(value.slice().buffer as ArrayBuffer);
				}
			} finally { reader.releaseLock(); }
			return { kind, blob: new Blob(chunks, { type: mime }) };
		}
	};
}
