/** Allow-list absolute HTTP(S) navigation targets from untrusted model output. */
export function safeNavigationUrl(input: unknown): string | null {
	if (typeof input !== 'string' || !input || input.length > 2000 || input !== input.trim()) return null;
	if (Array.from(input).some((c) => c.charCodeAt(0) <= 31 || c.charCodeAt(0) === 127 || c === '\\')) return null;
	try {
		const url = new URL(input);
		if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
		return url.href;
	} catch {
		return null;
	}
}
