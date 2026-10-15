<script lang="ts">
	// AppBlock / rich widget: fully custom HTML/CSS/JS in Open WebUI's existing
	// sandboxed iframe. OPT-IN (flag) and isolated:
	//   - sandbox: allow-scripts (NO allow-same-origin)
	//   - strict CSP: default-src 'none' (no network), inline style/script, data: images
	//   - theme CSS variables (--viz-*) so the widget follows the app theme
	//   - allow-listed bridge: GenUI.sendPrompt(text) / GenUI.copy(text)
	//   - autosize via ResizeObserver -> iframe:height
	import { getContext } from 'svelte';
	import FullHeightIframe from '$lib/components/common/FullHeightIframe.svelte';
	import IntelligentUIFallback from '$lib/intelligent-ui/components/IntelligentUIFallback.svelte';

	const i18n: any = getContext('i18n');

	export let html: string = '';
	export let title: string = 'Interactive widget';

	const CSP =
		"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";

	// Built without literal <style>/<script> tags so Svelte's CSS preprocessor
	// does not try to parse them out of this JS string.
	const T_STYLE = '<' + 'style>';
	const T_STYLE_END = '<' + '/style>';
	const T_SCRIPT = '<' + 'script>';
	const T_SCRIPT_END = '<' + '/script>';

	function buildDoc(body: string): string {
		const dark =
			typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
		const vars = dark
			? '--viz-text:#e5e7eb;--viz-muted:#9ca3af;--viz-panel:#111827;--viz-card:#0b1220;--viz-border:#374151;--viz-accent:#6366f1'
			: '--viz-text:#111827;--viz-muted:#6b7280;--viz-panel:#f9fafb;--viz-card:#ffffff;--viz-border:#e5e7eb;--viz-accent:#4f46e5';
		const css = `:root{${vars}}
html,body{margin:0;background:transparent;color:var(--viz-text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px}
*,*::before,*::after{box-sizing:border-box}`;
		const bridge =
			"(function(){" +
			"function send(t){try{parent.postMessage({type:'input:prompt:submit',text:String(t)},'*');}catch(e){}}" +
			"function copy(t){try{navigator.clipboard.writeText(String(t));}catch(e){}}" +
			"window.GenUI={sendPrompt:send,copy:copy};" +
			"function report(){try{parent.postMessage({type:'iframe:height',height:document.documentElement.scrollHeight},'*');}catch(e){}}" +
			"try{new ResizeObserver(report).observe(document.documentElement);}catch(e){}" +
			"window.addEventListener('load',report);setTimeout(report,60);" +
			"})();";
		return (
			'<!doctype html><html><head><meta charset="utf-8">' +
			`<meta http-equiv="Content-Security-Policy" content="${CSP}">` +
			T_STYLE +
			css +
			T_STYLE_END +
			'</head><body>' +
			body +
			T_SCRIPT +
			bridge +
			T_SCRIPT_END +
			'</body></html>'
		);
	}

	// Historical rendering: a persisted rich widget renders whenever the fence is
	// present (generation is gated server-side by the Filter). Sandboxed always.
	$: doc = html ? buildDoc(html) : '';
</script>

{#if html}
	<div class="my-3 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
		<div
			class="border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
		>
			{$i18n.t('Rich widget')}
		</div>
		<FullHeightIframe
			src={doc}
			{title}
			initialHeight={240}
			iframeClassName="w-full"
			allowScripts={true}
			allowSameOrigin={false}
			allowForms={true}
			allowPopups={false}
		/>
	</div>
{:else}
	<IntelligentUIFallback content={html} reason="empty widget" />
{/if}
