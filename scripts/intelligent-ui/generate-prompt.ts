/**
 * Generates the server-side Intelligent UI system prompt from OUR catalog using
 * OpenUI's own prompt-generation API (`library.prompt()`), and writes it to a
 * Python module the Filter can import. Run with:
 *
 *   npx tsx scripts/intelligent-ui/generate-prompt.ts
 *
 * Regenerate whenever the catalog changes; the catalog_version is embedded so
 * drift is detectable.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openuiLibrary, CATALOG_VERSION_ID } from '../../src/lib/intelligent-ui/catalog';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const prompt = openuiLibrary.prompt({
	preamble:
		'You may optionally present part of your answer as structured, interactive UI. This is OPTIONAL — normal Markdown is always the default.',
	additionalRules: [
		'Prefer normal Markdown for explanations, prose, reasoning, and simple answers.',
		'Use Intelligent UI ONLY when it materially improves clarity: a side-by-side comparison, headline metrics, or tabular data.',
		'Only the documented components exist. Never invent components.',
		'Use Stack as the root for most responses. Compose layouts with Stack (vertical), Row (horizontal), Grid (2-3 columns), Section (titled group) and Card (titled surface).',
		'Put leaf components (Metric, Comparison, Table, Badge, Divider, inputs) inside containers. Do not nest Stack inside Stack.',
		'Interactive inputs: declare state with `$name = default`, pass `$name` as the value of a Slider/Select/Switch/Checkbox/Input, and reference `$name` in expressions elsewhere. Inputs update the UI without a model call.',
		'You may compute derived values (`total = $seats * 29`) and use a ternary (`$flag ? a : b`) in any prop.',
		'Buttons take an action as the second argument: @Set($x, 20), @Reset($x), @ToAssistant("...") or @Run(query). Actions run locally with no model call.',
		'Example: Button("20 seats", @Set($seats, 20)) sets $seats to 20 and updates dependent values.',
		'For read-only data, use Data(source, title?) with an allow-listed source: conversation.notes, library.files, or knowledge.collections. Example: Data("library.files", "My files").',
		'To perform an approved action, pass a registered action id as the second Button argument, e.g. Button("Save note", "notes.create", {title:"Plan", content:"..."}). Only registered ids run, and the user must confirm.',
		'When you use UI, wrap the OpenUI Lang in a fenced block on its own lines:',
		':::intelligent-ui{v="1"}',
		'<openui lang here>',
		':::',
		'The fenced block must contain ONLY valid OpenUI Lang. You may write normal Markdown before and after it.',
		'Keep values short and plain text. Never emit HTML, scripts, CSS, URLs, or event handlers.',
		'If unsure whether UI helps, answer with normal Markdown.'
	],
	examples: [
		`User: Compare these three VPS plans.\n\nHere is a quick comparison:\n\n:::intelligent-ui{v="1"}\nroot = Comparison("VPS plans", [{name:"Basic",attributes:["1 vCPU","1 GB RAM"]},{name:"Pro",attributes:["2 vCPU","4 GB RAM"]},{name:"Team",attributes:["4 vCPU","8 GB RAM"]}])\n:::\n\nThe Pro plan is the best balance for most users.`,
		`User: What is the monthly cost?\n\n:::intelligent-ui{v="1"}\nroot = Metric("Monthly cost", "5 294 kr", "Including VAT")\n:::`,
		`User: Show the costs as a table.\n\n:::intelligent-ui{v="1"}\nroot = Table("Monthly costs", ["Item","Price"], [["Compute","3 200 kr"],["Storage","1 094 kr"]])\n:::`,
		`User: Make a small pricing calculator with a seats slider.\n\n:::intelligent-ui{v="1"}\n$seats = 8\nroot = Stack([s1, m1])\ns1 = Slider("Seats", $seats, 1, 50)\nm1 = Metric("Monthly price", total, "Incl. VAT")\ntotal = $seats * 29\n:::`,
		`User: Make a pricing calculator with quick buttons.\n\n:::intelligent-ui{v="1"}\n$seats = 8\nroot = Stack([row1, m1])\nrow1 = Row([b10, b20, b50, br])\nb10 = Button("10 seats", @Set($seats, 10))\nb20 = Button("20 seats", @Set($seats, 20))\nb50 = Button("50 seats", @Set($seats, 50))\nbr = Button("Reset", @Reset($seats))\nm1 = Metric("Monthly price", total, "Incl. VAT")\ntotal = $seats * 29\n:::`,
		`User: Show my knowledge collections in a table.\n\n:::intelligent-ui{v="1"}\nroot = Data("knowledge.collections", "Knowledge collections")\n:::`,
		`User: Save a short note called "Plan".\n\n:::intelligent-ui{v="1"}\nroot = Stack([b1])\nb1 = Button("Save note", "notes.create", {title:"Plan", content:"Ship the audit."})\n:::`,
		`User: Give me a small dashboard of the key numbers.\n\n:::intelligent-ui{v="1"}\nroot = Stack([g1, t1])\ng1 = Grid([c1, c2])\nc1 = Card("Cost", [m1])\nm1 = Metric("Monthly cost", "5 294 kr", "Incl. VAT")\nc2 = Card("Seats", [m2])\nm2 = Metric("Seats", "8")\nt1 = Section("Breakdown", [tbl])\ntbl = Table("", ["Item","Price"], [["Compute","3 200 kr"],["Storage","1 094 kr"]])\n:::`,
		`User: Who was Nikola Tesla?\n\nNikola Tesla was a Serbian-American inventor and electrical engineer best known for his contributions to the design of the modern alternating current (AC) electricity supply system.`
	]
});

const richPrompt = `You may also render a FULLY CUSTOM widget with HTML/CSS/JS when the native components are not enough (for example 3D scenes, custom canvas, maps, or bespoke mini-apps). Emit it in a fenced block:

:::intelligent-ui-html{v="1"}
<html/css/js here>
:::

Rules for rich widgets:
- Self-contained: no external network requests and no external images or scripts (a strict CSP blocks them).
- Style with the provided theme variables: --viz-text, --viz-muted, --viz-panel, --viz-card, --viz-border, --viz-accent.
- To send a follow-up message use window.GenUI.sendPrompt("..."); to copy use window.GenUI.copy("...").
- Keep it small and responsive; it renders in a sandboxed iframe.
- Prefer native components when they suffice; use a rich widget only when it is clearly better.`;

const python = `"""GENERATED FILE — do not edit by hand.

Generated by scripts/intelligent-ui/generate-prompt.ts from the shared catalog
(src/lib/intelligent-ui/catalog.ts) using OpenUI's library.prompt().

catalog_version: ${CATALOG_VERSION_ID}
"""

CATALOG_VERSION = ${CATALOG_VERSION_ID}

PROMPT = r"""${prompt}"""

RICH_PROMPT = r"""${richPrompt}"""
`;

const outPath = resolve(repoRoot, 'backend/open_webui/intelligent_ui/catalog_prompt.py');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, python);
console.log(`wrote ${outPath} (${prompt.length} chars, catalog_version ${CATALOG_VERSION_ID})`);
