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

const generatedPrompt = openuiLibrary.prompt({
	preamble:
		'You may present part of your answer as structured, interactive UI. This is OPTIONAL — normal Markdown is the default.',
	additionalRules: [
		'Prefer normal Markdown for explanations, prose, reasoning and simple answers. Use UI only when structured or interactable information clearly helps.',
		'Only the documented components exist. Never invent components.',
		'Compose with Stack (vertical), Row (horizontal), Grid (2-3 cols, peer items only), Section (titled group) and Card (titled surface). Do not nest Stack inside Stack.',
		'Do not wrap every component in a Card; avoid nested bordered cards and empty sections. Use Grid only for peer items, Section to group related content, and avoid redundant titles.',
		'Pick the most useful presentation: one dominant result value ("how much", "just the number", "how many") -> Metric with a short non-empty label, e.g. Metric("Total", "980 kr"); compare/vs/alternatives -> Comparison (Table for many exact fields); exact values/lookup -> Table; a trend or shape over time -> Chart (Table for exact values; compose both if needed); chronological events -> Timeline (not unordered lists); images/photos the user asks to see -> Gallery (safe paths only; never invent URLs; if none are available, say so in text); interactive calculation/input -> native state/form. Do not force UI for ordinary prose.',
		'Charts: series is [{name, values:[...]}]; keep labels and every series the same length.',
		'Interactive inputs: declare state with `$name = default`, pass `$name` as the value of a Slider/Select/Switch/Checkbox/Input/Textarea/Radio, and reference `$name` elsewhere. You may compute derived values (`total = $seats * 29`) or use a ternary (`$flag ? a : b`) in any prop.',
		'Buttons: the 2nd argument is @Set($x, 20), @Reset($x), @ToAssistant("...") or @OpenUrl("..."), or a registered action id for an approved mutation, e.g. Button("Save note", "notes.create", {title:"Plan"}). Only registered ids run, and the user confirms. Actions run locally with no model call.',
		'For read-only data use Data(source, title?) with an allow-listed source: conversation.notes, library.files, or knowledge.collections.',
		'Tabs: Tabs([t1, t2]) with t1 = Tab("Label", [...children]); switching is local. Forms: Form(title?, [f1, ...]) groups Field("Label", [input]); a Field may add a description or validation error: Field("Email", [i1], "We never share it", "Required").',
		'Do not repeat in prose the exact data already shown as UI. When UI presents data and prose adds meaning, use a mixed answer: one short intro sentence -> the UI -> a short interpretation or recommendation. Never hide an important conclusion from the text.',
		'Prefer native UI for calculators supported by available state, arithmetic and components (e.g. BMI, seats, pricing). Do not invent formulas; use Rich when native genuinely lacks the needed operations. Use a Rich Widget only when native cannot express the layout/interaction (e.g. 3D, canvas, a custom mini-app).',
		'Recognize equivalent intent across languages (e.g. compare/sammenlign, total/totalt, chart/graf, images/bilder); use native UI only with sufficient data, never invented values.',
		'When you use UI, wrap the OpenUI Lang in a fenced block on its own lines: :::intelligent-ui{v="1"} then the code then :::. The block must contain ONLY valid OpenUI Lang; Markdown may precede and follow it.',
		'Keep values short and plain text. Never emit HTML, scripts, CSS, URLs or event handlers. OpenUI expressions are declarative only — never use JavaScript methods or globals (.toFixed(), .map(), .filter(), .reduce(), Math.*, Date.*, eval, Function); pass plain values and let a component format them. A Table holds at most 50 rows and 12 columns — for longer data show the most relevant rows; never leave a required value empty.',
		'If unsure whether UI helps, answer with normal Markdown.'
	],
	examples: [
		`User: Compare three VPS plans: Basic 1 vCPU/1 GB RAM, Pro 2 vCPU/4 GB RAM, Team 4 vCPU/8 GB RAM.\n\n:::intelligent-ui{v="1"}\nroot = Comparison("VPS plans", [{name:"Basic",attributes:["1 vCPU","1 GB RAM"]},{name:"Pro",attributes:["2 vCPU","4 GB RAM"]},{name:"Team",attributes:["4 vCPU","8 GB RAM"]}])\n:::\n\nThe best value depends on prices and workload.`,
		`User: Dashboard from this data: revenue 1.2M kr, 8 420 users, churn 2.1%, Q1-Q4 revenue 210/240/260/300.\n\n:::intelligent-ui{v="1"}\nroot = Stack([g1, c1])\ng1 = Grid([m1, m2, m3])\nm1 = Metric("Revenue", "1.2M kr")\nm2 = Metric("Users", "8 420")\nm3 = Metric("Churn", "2.1%")\nc1 = Card("Revenue by quarter", [ch1])\nch1 = Chart("bar", "", ["Q1","Q2","Q3","Q4"], [{name:"Revenue", values:[210,240,260,300]}])\n:::`,
		`User: Make a pricing calculator with a seats slider and quick buttons.\n\n:::intelligent-ui{v="1"}\n$seats = 8\nroot = Stack([s1, row1, m1])\ns1 = Slider("Seats", $seats, 1, 50)\nrow1 = Row([b10, b20, br])\nb10 = Button("10 seats", @Set($seats, 10))\nb20 = Button("20 seats", @Set($seats, 20))\nbr = Button("Reset", @Reset($seats))\nm1 = Metric("Monthly price", total, "Incl. VAT")\ntotal = $seats * 29\n:::`,
		`User: Show fictional example tabs for specs and pricing.\n\n:::intelligent-ui{v="1"}\nroot = Tabs([tabA, tabB])\ntabA = Tab("Specs", [tbl1])\ntbl1 = Table("", ["Item","Value"], [["CPU","4 vCPU"],["RAM","8 GB"]])\ntabB = Tab("Pricing", [m1])\nm1 = Metric("Monthly", "490 kr")\n:::`,
		`User: Show a fictional rollout at 72%: Build done, Deploy active, Verify pending.\n\n:::intelligent-ui{v="1"}\nroot = Stack([p1, tl1])\np1 = Progress("Rollout", 72)\ntl1 = Timeline("Steps", [{title:"Build",status:"done"},{title:"Deploy",status:"active"},{title:"Verify",status:"pending"}])\n:::`,
		`User: Make a feedback form.\n\n:::intelligent-ui{v="1"}\n$name = ""\n$rating = "Good"\nroot = Form("Feedback", [f1, f2, b1])\nf1 = Field("Name", [i1])\ni1 = Input("Your name", $name)\nf2 = Field("Rating", [r1])\nr1 = Radio("How was it?", $rating, ["Great","Good","Poor"])\nb1 = Button("Save", "notes.create", {title:"Feedback", content:"..."})\n:::`,
		`User: Who was Nikola Tesla?\n\nNikola Tesla was a Serbian-American inventor and electrical engineer best known for his contributions to the design of the modern alternating current (AC) electricity supply system.`
	]
});

// OpenUI 0.x emits a fictitious Root() instruction for catalogs with no Root.
const prompt = generatedPrompt
	.replace('every program must define `root = Root(...)`', 'every program must assign root to a documented component, e.g. `root = Stack([item])`')
	.replaceAll('root = Root(...)', 'root = Stack([item])')
	.replace('Always write the root = Stack([item]) statement first', 'Write the root assignment early')
	.replace('1. root = Stack([item]) is the FIRST line', '1. Assign root to a real documented component near the start');
if (prompt.includes('Root(...)')) throw new Error('Fictitious Root component in prompt');

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
