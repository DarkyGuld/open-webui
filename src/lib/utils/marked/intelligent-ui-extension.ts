/**
 * Marked extension for Intelligent UI fences:
 *
 *   :::intelligent-ui{v="1"}
 *   <openui lang>
 *   :::
 *
 * Unlike the generic colon-fence extension (which only matches a *closed* fence),
 * this matches an OPEN fence too, so the block can render progressively while the
 * model is still streaming. The token carries `partial: true` until the closing
 * `:::` arrives.
 *
 * Registered BEFORE the colon-fence extension in Markdown.svelte so it wins for
 * this fence type.
 */

function parseAttributes(attributeList: string): Record<string, string> {
	const attributes: Record<string, string> = {};
	for (const [, key, value] of attributeList.matchAll(/([\w-]+)="([^"]*)"/g)) {
		attributes[key] = value;
	}
	return attributes;
}

const CLOSED = /^:::intelligent-ui(?:\{([^\n]*)\})?[^\n]*\n([\s\S]*?)\n:::(?:\s*(?:\n|$))/;
const OPEN = /^:::intelligent-ui(?:\{([^\n]*)\})?[^\n]*\n([\s\S]*)$/;

function intelligentUiTokenizer(this: any, src: string) {
	let match = CLOSED.exec(src);
	let closed = true;
	if (!match) {
		match = OPEN.exec(src);
		closed = false;
	}
	if (!match) return;

	return {
		type: 'intelligentUi',
		raw: match[0],
		fenceType: 'intelligent-ui',
		attributes: parseAttributes(match[1] ?? ''),
		text: (match[2] ?? '').trim(),
		partial: !closed
	};
}

function intelligentUiStart(src: string) {
	const idx = src.match(/^:::intelligent-ui/m);
	return idx ? idx.index! : -1;
}

function intelligentUiRenderer() {
	// Rendered by MarkdownTokens -> IntelligentUIBlock (Svelte), not by marked.
	return '';
}

export default function intelligentUiExtension(_options = {}) {
	return {
		extensions: [
			{
				name: 'intelligentUi',
				level: 'block' as const,
				start: intelligentUiStart,
				tokenizer: intelligentUiTokenizer,
				renderer: intelligentUiRenderer
			}
		]
	};
}
