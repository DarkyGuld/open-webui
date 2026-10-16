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
		'You may present part of your answer as structured, interactive UI. This is OPTIONAL — normal Markdown is the default.',
	additionalRules: [
		'Prefer normal Markdown for explanations, prose, reasoning and simple answers. Use UI only when structured or interactable information clearly helps.',
		'Only the documented components exist. Never invent components.',
		'Compose with Stack (vertical), Row (horizontal), Grid (2-3 cols, peer items only), Section (titled group) and Card (titled surface). Do not nest Stack inside Stack.',
		'Do not wrap every component in a Card; avoid nested bordered cards and empty decorative sections. Use Grid only for peer items, Section to group related content, and avoid redundant titles.',
		'Pick the most useful presentation: a single dominant result value ("how much", "the total", "just the number", "how many") -> Metric; compare / vs / alternatives / options -> Comparison (or Table when many exact fields); an exact dataset or rows/columns -> Table; a trend over time or category comparison -> Chart; a sequence of events -> Timeline; an interactive calculation or input -> native state/form. Do not force UI for ordinary prose.',
		'Charts: series is [{name:"...", values:[...]}]; keep labels and every series the same length. Prefer Table when exact values matter.',
		'Interactive inputs: declare state with `$name = default`, pass `$name` as the value of a Slider/Select/Switch/Checkbox/Input/Textarea/Radio, and reference `$name` elsewhere. You may compute derived values (`total = $seats * 29`) or use a ternary (`$flag ? a : b`) in any prop. Inputs update the UI with no model call.',
		'Buttons: the 2nd argument is @Set($x, 20), @Reset($x), @ToAssistant("...") or @OpenUrl("..."), or a registered action id for an approved mutation, e.g. Button("Save note", "notes.create", {title:"Plan"}). Only registered ids run, and the user confirms. Actions run locally with no model call.',
		'For read-only data use Data(source, title?) with an allow-listed source: conversation.notes, library.files, or knowledge.collections.',
		'Tabs: Tabs([t1, t2]) with t1 = Tab("Label", [ ...children ]); switching is local. Forms: Form(title?, [f1, ...]) groups Field("Label", [input]); a Field may add a description or validation error: Field("Email", [i1], "We never share it", "Required").',
		'Do not repeat in prose the exact data already shown as UI — Markdown should explain meaning, reasoning, caveats or recommendations. Never hide an important conclusion from the text.',
		'When you use UI, wrap the OpenUI Lang in a fenced block on its own lines: :::intelligent-ui{v="1"} then the code then :::. The block must contain ONLY valid OpenUI Lang; Markdown may precede and follow it.',
		'Keep values short and plain text. Never emit HTML, scripts, CSS, URLs or event handlers. OpenUI expressions are declarative only — never use JavaScript methods or globals (.toFixed(), .map(), .filter(), .reduce(), Math.*, Date.*, eval, Function); pass plain values and let a component format them.',
		'If unsure whether UI helps, answer with normal Markdown.'
	],
	examples: [
		`User: Compare these three VPS plans.\n\nHere is a quick comparison:\n\n:::intelligent-ui{v="1"}\nroot = Comparison("VPS plans", [{name:"Basic",attributes:["1 vCPU","1 GB RAM"]},{name:"Pro",attributes:["2 vCPU","4 GB RAM"]},{name:"Team",attributes:["4 vCPU","8 GB RAM"]}])\n:::\n\nThe Pro plan is the best balance for most users.`,
		`User: Give me a small dashboard of the key numbers.\n\n:::intelligent-ui{v="1"}\nroot = Stack([g1, c1])\ng1 = Grid([m1, m2, m3])\nm1 = Metric("Revenue", "1.2M kr")\nm2 = Metric("Users", "8 420")\nm3 = Metric("Churn", "2.1%")\nc1 = Card("Revenue by quarter", [ch1])\nch1 = Chart("bar", "", ["Q1","Q2","Q3","Q4"], [{name:"Revenue", values:[210,240,260,300]}])\n:::`,
		`User: Make a pricing calculator with a seats slider and quick buttons.\n\n:::intelligent-ui{v="1"}\n$seats = 8\nroot = Stack([s1, row1, m1])\ns1 = Slider("Seats", $seats, 1, 50)\nrow1 = Row([b10, b20, br])\nb10 = Button("10 seats", @Set($seats, 10))\nb20 = Button("20 seats", @Set($seats, 20))\nbr = Button("Reset", @Reset($seats))\nm1 = Metric("Monthly price", total, "Incl. VAT")\ntotal = $seats * 29\n:::`,
		`User: Show tabs for specs and pricing.\n\n:::intelligent-ui{v="1"}\nroot = Tabs([tabA, tabB])\ntabA = Tab("Specs", [tbl1])\ntbl1 = Table("", ["Item","Value"], [["CPU","4 vCPU"],["RAM","8 GB"]])\ntabB = Tab("Pricing", [m1])\nm1 = Metric("Monthly", "490 kr")\n:::`,
		`User: Show the deploy progress and steps.\n\n:::intelligent-ui{v="1"}\nroot = Stack([p1, tl1])\np1 = Progress("Rollout", 72)\ntl1 = Timeline("Steps", [{title:"Build",status:"done"},{title:"Deploy",status:"active"},{title:"Verify",status:"pending"}])\n:::`,
		`User: Make a feedback form.\n\n:::intelligent-ui{v="1"}\n$name = ""\n$rating = "Good"\nroot = Form("Feedback", [f1, f2, b1])\nf1 = Field("Name", [i1])\ni1 = Input("Your name", $name)\nf2 = Field("Rating", [r1])\nr1 = Radio("How was it?", $rating, ["Great","Good","Poor"])\nb1 = Button("Save", "notes.create", {title:"Feedback", content:"..."})\n:::`,
		`User: Show my knowledge collections in a table.\n\n:::intelligent-ui{v="1"}\nroot = Data("knowledge.collections", "Knowledge collections")\n:::`,
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
