import { describe, expect, it, vi } from 'vitest';
import {
	createLibraryApi,
	fileKind,
	normalizeFile,
	previewKind,
	validFileId,
	MAX_PREVIEW_BYTES,
	SEARCH_PAGE_SIZE
} from './files';

const fixture = {
	id: '1234-safe-id',
	user_id: 'owner',
	filename: 'report.txt',
	meta: { content_type: 'text/plain', size: 7, url: 'https://untrusted.invalid/file' },
	path: '/private/server/path',
	data: { content: 'private extracted content' },
	created_at: 1700000000
};
function client(response: Response | (() => Response)) {
	const request = vi.fn(
		async (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
			void input;
			void init;
			return typeof response === 'function' ? response() : response;
		}
	);
	return { api: createLibraryApi('/api/v1', request), request };
}

describe('read-only Library boundary', () => {
	it('normalizes only displayed metadata; never exposes extracted content, owner or original paths', () => {
		const file = normalizeFile(fixture)!;
		expect(file).toEqual({
			id: '1234-safe-id',
			name: 'report.txt',
			mime: 'text/plain',
			size: 7,
			kind: 'document',
			createdAt: 1700000000
		});
		expect(JSON.stringify(file)).not.toContain('private');
	});
	it.each(['../secret', 'x/y', 'https://elsewhere', '', '__proto__', 'a?token=x', 'a#x'])(
		'rejects unsafe file ids: %s',
		(id) => {
			expect(validFileId(id)).toBe(false);
			expect(normalizeFile({ ...fixture, id })).toBeNull();
		}
	);
	it('handles malformed legacy metadata without fabricating sizes/dates', () => {
		const f = normalizeFile({
			...fixture,
			meta: { size: -1, content_type: ['image/png'] },
			created_at: Infinity
		})!;
		expect(f.size).toBeNull();
		expect(f.createdAt).toBeNull();
		expect(f.mime).toBe('');
	});
	it('lists paginated metadata using GET, bearer auth, content=false, and abort/redirect guards', async () => {
		const { api, request } = client(Response.json({ items: [fixture], total: 101 }));
		const controller = new AbortController();
		const result = await api.list('synthetic', '', 2, controller.signal);
		expect(result.items).toHaveLength(1);
		expect(result.rows).toBe(1);
		expect(result.hasMore).toBe(true);
		expect(request).toHaveBeenCalledWith(
			'/api/v1/files/?content=false&page=2',
			expect.objectContaining({
				method: 'GET',
				headers: { authorization: 'Bearer synthetic' },
				redirect: 'error'
			})
		);
		const signal = request.mock.calls[0][1]!.signal!;
		expect(signal.aborted).toBe(false);
		controller.abort();
		expect(signal.aborted).toBe(true);
	});
	it('derives "more" from the server total and consumed rows, never from an assumed page size', async () => {
		const { api } = client(() => Response.json({ items: [fixture], total: 101 }));
		expect((await api.list('t', '', 1, undefined, 100)).hasMore).toBe(false);
		expect((await api.list('t', '', 1, undefined, 99)).hasMore).toBe(true);
		expect((await api.list('t', '', 1, undefined, 0)).hasMore).toBe(true);
	});
	it('rejects a metadata list without a usable total instead of guessing pagination', async () => {
		await expect(
			client(Response.json({ items: [fixture] })).api.list('t', '', 1)
		).rejects.toMatchObject({ code: 'load' });
	});
	it('uses the existing filename search with correct offset and encoding', async () => {
		const { api, request } = client(Response.json([fixture]));
		await api.list('synthetic', 'report & memo', 3);
		const url = new URL(request.mock.calls[0][0] as string, 'http://localhost');
		expect(url.searchParams.get('filename')).toBe('*report & memo*');
		expect(url.searchParams.get('skip')).toBe('100');
		expect(url.searchParams.get('content')).toBe('false');
	});
	it('treats a full search page as the only "maybe more" signal', async () => {
		const full = Array.from({ length: SEARCH_PAGE_SIZE }, () => fixture);
		const { api } = client(Response.json(full));
		expect((await api.list('t', 'report', 1)).hasMore).toBe(true);
		const { api: partial } = client(Response.json([fixture]));
		expect((await partial.list('t', 'report', 1)).hasMore).toBe(false);
	});
	it('distinguishes no search results, denied access, malformed responses and server errors', async () => {
		expect(
			(await client(new Response('', { status: 404 })).api.list('t', 'none', 1)).items
		).toEqual([]);
		await expect(
			client(new Response('', { status: 403 })).api.list('t', '', 1)
		).rejects.toMatchObject({ code: 'denied' });
		await expect(
			client(new Response('', { status: 503 })).api.list('t', '', 1)
		).rejects.toMatchObject({ code: 'load' });
		await expect(
			client(Response.json({ unexpected: [] })).api.list('t', '', 1)
		).rejects.toMatchObject({ code: 'load' });
	});
	it('builds content paths ONLY from validated ids, ignoring any metadata URLs', async () => {
		const { api, request } = client(
			new Response('hello', { headers: { 'content-type': 'text/plain' } })
		);
		const p = await api.preview('synthetic', fixture.id);
		expect(await p.blob!.text()).toBe('hello');
		expect(request.mock.calls[0][0]).toBe('/api/v1/files/1234-safe-id/content');
		await expect(api.preview('t', '../secret')).rejects.toMatchObject({ code: 'unavailable' });
		expect(request).toHaveBeenCalledTimes(1);
	});
	it.each(['text/html', 'image/svg+xml', 'application/xml'])(
		'active-looking %s stays escaped text, never a document iframe',
		(mime) => {
			expect(previewKind(mime)).toBe('text');
		}
	);
	it('classifies media for display but preview grants depend on actual response MIME', () => {
		expect(fileKind('video/mp4', 'video.mp4')).toBe('video');
		expect(fileKind('application/octet-stream', 'photo.png')).toBe('image');
		expect(previewKind('application/octet-stream')).toBe('unsupported');
		expect(previewKind('application/pdf')).toBe('pdf');
		expect(previewKind('video/webm')).toBe('video');
	});
	it('rejects oversized Content-Length before reading', async () => {
		const { api } = client(
			new Response('tiny', {
				headers: { 'content-type': 'text/plain', 'content-length': String(MAX_PREVIEW_BYTES + 1) }
			})
		);
		await expect(api.preview('t', fixture.id)).rejects.toMatchObject({ code: 'too-large' });
	});
	it('enforces ACTUAL streamed-byte limits even if size metadata/Content-Length lies', async () => {
		const cancelled = vi.fn();
		const response = new Response(
			new ReadableStream({
				pull(c) {
					c.enqueue(new Uint8Array(8 * 1024 * 1024));
				},
				cancel: cancelled
			}),
			{ headers: { 'content-type': 'image/png', 'content-length': '10' } }
		);
		await expect(client(response).api.preview('t', fixture.id)).rejects.toMatchObject({
			code: 'too-large'
		});
		expect(cancelled).toHaveBeenCalled();
	});
	it('does not load unsupported content bodies unnecessarily', async () => {
		const cancel = vi.fn();
		const response = new Response(new ReadableStream({ cancel }), {
			headers: { 'content-type': 'application/zip' }
		});
		expect(await client(response).api.preview('t', fixture.id)).toEqual({
			kind: 'unsupported',
			blob: null
		});
		expect(cancel).toHaveBeenCalled();
	});
});
