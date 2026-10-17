/**
 * The Rich Widget SAFETY CONTRACT — the single source of truth shared by the
 * production renderer (`components/RichWidget.svelte`) and the evaluation
 * contract (`evaluation.ts`), so the benchmark validates widgets against the
 * REAL capabilities the sandbox grants, not a copy of them.
 *
 * Production guarantees (see RichWidget.svelte):
 *   - sandbox: allow-scripts ONLY (no same-origin, no forms, no downloads,
 *     no fullscreen, no popups)
 *   - strict CSP: default-src 'none' (no network), inline style/script,
 *     data: images/fonts/media, no connect, no form-action, no base-uri
 *   - allow-listed bridge: GenUI.sendPrompt / GenUI.copy; autosize reports
 */
export const RICH_CSP =
	"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";

export const RICH_SANDBOX = {
	allowScripts: true,
	allowSameOrigin: false,
	allowForms: false,
	allowDownloads: false,
	allowFullscreen: false,
	allowPopups: false
} as const;

/**
 * Static (non-browser) validation of a rich-widget body against the REAL
 * contract above. Static validation cannot prove a widget *executes* correctly
 * — browser-verified functionality is a separate step (Playwright).
 */
export function validateRichWidgetHtml(html: string): { valid: boolean; reason: string } {
	const body = (html ?? '').trim();
	if (body.length < 20) return { valid: false, reason: 'empty-or-trivial' };
	if (!/<[a-z][^>]*>/i.test(body)) return { valid: false, reason: 'no-html-content' };
	// CSP default-src 'none' / connect-src 'none': no external or network refs
	if (/(?:\b(?:src|href)\s*=\s*["']?\s*https?:\/\/|url\(\s*["']?\s*https?:\/\/)/i.test(body))
		return { valid: false, reason: 'external-network-reference' };
	if (/\b(fetch\s*\(|XMLHttpRequest|new\s+EventSource|WebSocket\s*\()/i.test(body))
		return { valid: false, reason: 'network-api-use' };
	// sandbox forbids forms / downloads / popups / top navigation
	if (/<\s*form[\s>]/i.test(body)) return { valid: false, reason: 'form-in-sandboxed-widget' };
	if (/\bwindow\.open\s*\(|\btarget\s*=\s*["']_blank/i.test(body))
		return { valid: false, reason: 'popup-or-navigation-blocked' };
	if (/\bdownload\s*=/i.test(body)) return { valid: false, reason: 'download-blocked' };
	// script execution is limited to inline — javascript: URIs are not part of
	// the contract (and CSP restricts them)
	if (/["']\s*javascript:/i.test(body)) return { valid: false, reason: 'javascript-uri' };
	return { valid: true, reason: '' };
}
