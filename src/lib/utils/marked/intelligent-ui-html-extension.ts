/**
 * Marked extension for the Intelligent UI "rich widget" (AppBlock) fence:
 *
 *   :::intelligent-ui-html{v="1"}
 *   <html/css/js>
 *   :::
 *
 * This is the OPT-IN escape hatch for fully custom layouts (arbitrary HTML/CSS/JS),
 * rendered in Open WebUI's existing sandboxed iframe. Matched open OR closed so it
 * renders progressively. Must be registered BEFORE the intelligent-ui extension
 * (which would otherwise match the `:::intelligent-ui` prefix).
 */

function parseAttributes(attributeList: string): Record<string, string> {
	const attributes: Record<string, string> = {};
	for (const [, key, value] of attributeList.matchAll(/([\w-]+)="([^"]*)"/g)) {
		attributes[key] = value;
	}
	return attributes;
}

const CLOSED = /^:::intelligent-ui-html(?:\{([^\n]*)\})?[^\n]*\n([\s\S]*?)\n:::(?:\s*(?:\n|$))/;
const OPEN = /^:::intelligent-ui-html(?:\{([^\n]*)\})?[^\n]*\n([\s\S]*)$/;

function tokenizer(this: any, src: string) {
	let match = CLOSED.exec(src);
	let closed = true;
	if (!match) {
		match = OPEN.exec(src);
		closed = false;
	}
	if (!match) return;
	return {
		type: 'intelligentUiHtml',
		raw: match[0],
		fenceType: 'intelligent-ui-html',
		attributes: parseAttributes(match[1] ?? ''),
		text: (match[2] ?? '').trim(),
		partial: !closed
	};
}

function start(src: string) {
	const idx = src.match(/^:::intelligent-ui-html/m);
	return idx ? idx.index! : -1;
}

function renderer() {
	return '';
}

export default function intelligentUiHtmlExtension(_options = {}) {
	return {
		extensions: [
			{
				name: 'intelligentUiHtml',
				level: 'block' as const,
				start,
				tokenizer,
				renderer
			}
		]
	};
}
