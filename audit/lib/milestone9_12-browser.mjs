// Real local application, deterministic fixtures, zero model calls.
// This tests the SHIPPED local-only slice, not the rejected server prototype.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const BASE = process.env.PAW_BASE || 'http://127.0.0.1:5173';
const API = 'http://127.0.0.1:8080';
const token = process.env.PAW_TEST_TOKEN || fs.readFileSync('/tmp/token', 'utf8').trim();
const OUT = path.resolve('local/intelligent-ui/milestone-9.12');
fs.mkdirSync(OUT, { recursive: true });
const content = `$seats = 8
$private = ""
root = Stack([s1, m1, br, i1])
s1 = Slider("Seats", $seats, 1, 50)
m1 = Metric("Monthly price", total)
total = $seats * 29
br = Button("Reset", @Reset($seats))
i1 = Input("Private note", $private)`;
async function seed(name, partial = false, suppliedContent) {
	const text = suppliedContent ?? `:::intelligent-ui{v="1"}\n${content}${partial ? '' : '\n:::'}`;
	const message = { id: 'm1', role: 'assistant', content: text, parentId: null,
		childrenIds: [], done: true, model: 'deepseek-v4.1-flash', timestamp: Math.floor(Date.now() / 1000) };
	const res = await fetch(`${API}/api/v1/chats/new`, { method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify({ chat: { title: `M9.12 synthetic ${name}`, models: [message.model], params: {},
			history: { currentId: 'm1', messages: { m1: message } }, messages: [message] } }) });
	assert(res.ok, `fixture creation failed: ${res.status}`);
	return (await res.json()).id;
}
const ids = { a: await seed('a'), b: await seed('b'), partial: await seed('partial', true) };
ids.invalid = await seed('invalid', false, ':::intelligent-ui{v="1"}\nroot = Metric("", "42")\n:::');
ids.query = await seed('query', false, ':::intelligent-ui{v="1"}\nroot = Data("unknown.source", "Unavailable source")\n:::');
ids.mutation = await seed('mutation', false, ':::intelligent-ui{v="1"}\nroot = Button("Create synthetic note", "notes.create", {title:"Synthetic fixture",content:"test"})\n:::');
ids.rich = await seed('rich', false, ':::intelligent-ui-html{v="1"}\n<div><button onclick="this.textContent=\'Clicked\'">Click fixture</button></div>\n:::');
ids.normal = await seed('normal', false, 'A normal explanatory answer with no interactive block.');
const browser = await chromium.launch();
const errors = [];
const checks = [];
let variableWrites = 0;
let mutations = 0;
async function context(viewport = { width: 1280, height: 1000 }) {
	const c = await browser.newContext({ viewport });
	await c.addInitScript((t) => {
		if (window !== window.top) return; // never inject auth into sandboxed frames
		localStorage.setItem('token', t);
		if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');
	}, token);
	const page = await c.newPage();
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('socket.io')) errors.push(m.text()); });
	page.on('request', (r) => {
		if (r.method() === 'POST' && r.url().includes('/api/v1/notes/create')) mutations++;
		if (r.method() === 'POST' && r.url().includes('/api/v1/chats/')) {
			try { if (r.postDataJSON()?.variables) variableWrites++; } catch { /* not JSON */ }
		}
	});
	return { c, page };
}
async function open(page, id) {
	await page.goto(`${BASE}/c/${id}`, { waitUntil: 'domcontentloaded' });
	await page.getByText('Monthly price', { exact: true }).waitFor({ timeout: 30000 });
	await page.waitForTimeout(600); // async digest/restore
}
async function seats(page, n) {
	await page.locator('input[type=range]').evaluate((el, v) => {
		el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true }));
	}, n);
	await page.getByText(String(n * 29), { exact: true }).waitFor();
}
function check(name, value) { assert(value, name); checks.push(name); }
try {
	const { page } = await context();
	await open(page, ids.a);
	await seats(page, 20);
	check('live calculator update', await page.getByText('580', { exact: true }).isVisible());
	await page.locator('input[type=text]').last().fill('SYNTHETIC_PRIVATE_DO_NOT_PERSIST');
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.getByText('580', { exact: true }).waitFor({ timeout: 30000 });
	check('reload restores safe numeric state', await page.locator('input[type=range]').inputValue() === '20');
	check('typed text not restored', await page.locator('input[type=text]').last().inputValue() === '');
	const savedText = await page.evaluate(() => Object.keys(localStorage)
		.filter((k) => k.startsWith('intelligent-ui-controls-v1:')).map((k) => localStorage.getItem(k)).join(''));
	check('typed text not stored', !savedText.includes('SYNTHETIC_PRIVATE_DO_NOT_PERSIST'));
	await open(page, ids.b);
	check('separate conversation has default state', await page.locator('input[type=range]').inputValue() === '8');
	await open(page, ids.a);
	check('returning to conversation restores its own state', await page.locator('input[type=range]').inputValue() === '20');
	check('desktop dark theme is actually active', await page.evaluate(() => document.documentElement.classList.contains('dark')));
	await page.screenshot({ path: path.join(OUT, '01-local-restored-dark.png'), fullPage: true });
	const other = await context();
	await open(other.page, ids.a);
	check('second device does not falsely claim server sync', await other.page.locator('input[type=range]').inputValue() === '8');
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await page.getByText('232', { exact: true }).waitFor();
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.getByText('232', { exact: true }).waitFor({ timeout: 30000 });
	check('reset persists', await page.locator('input[type=range]').inputValue() === '8');
	await open(page, ids.partial);
	await seats(page, 25);
	check('partial streaming-mode interaction preserved', await page.getByText('725', { exact: true }).isVisible());
	await page.evaluate(() => localStorage.setItem('theme', 'light'));
	await open(page, ids.a);
	check('desktop light theme is actually active', await page.evaluate(() => !document.documentElement.classList.contains('dark')));
	await page.screenshot({ path: path.join(OUT, '02-local-light.png'), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => localStorage.setItem('theme', 'dark'));
	await open(page, ids.a);
	check('mobile has no horizontal page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
	await page.screenshot({ path: path.join(OUT, '03-local-mobile.png'), fullPage: true });
	await page.setViewportSize({ width: 1280, height: 1000 });
	await page.goto(`${BASE}/c/${ids.invalid}`);
	await page.getByText('Interactive view unavailable', { exact: true }).waitFor({ timeout: 30000 });
	check('invalid program falls back safely', await page.getByText('Interactive view unavailable', { exact: true }).isVisible());
	await page.goto(`${BASE}/c/${ids.query}`);
	await page.getByText('Couldn’t load this data', { exact: true }).waitFor({ timeout: 30000 });
	check('unknown query source shows safe error', await page.getByRole('button', { name: 'Retry', exact: true }).isVisible());
	await page.goto(`${BASE}/c/${ids.mutation}`);
	await page.getByRole('button', { name: 'Create synthetic note', exact: true }).waitFor({ timeout: 30000 });
	check('history open does not execute mutation', mutations === 0);
	await page.getByRole('button', { name: 'Create synthetic note', exact: true }).click();
	await page.getByRole('dialog').waitFor();
	check('mutation requires host confirmation', await page.getByRole('dialog').isVisible());
	await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	check('cancel does not execute mutation', mutations === 0);
	await page.reload();
	await page.getByRole('button', { name: 'Create synthetic note', exact: true }).waitFor({ timeout: 30000 });
	check('reload does not replay mutation', mutations === 0);
	await page.goto(`${BASE}/c/${ids.rich}`);
	const iframe = page.locator('iframe').first();
	await iframe.waitFor({ timeout: 30000 });
	const sandbox = await iframe.getAttribute('sandbox');
	check('Rich scripts enabled but same-origin/forms/downloads/popups disabled', sandbox?.includes('allow-scripts') && !/allow-(same-origin|forms|downloads|popups)/.test(sandbox));
	await page.frameLocator('iframe').getByRole('button', { name: 'Click fixture' }).click();
	check('Rich actually responds inside isolated frame', await page.frameLocator('iframe').getByRole('button', { name: 'Clicked' }).isVisible());
	await page.goto(`${BASE}/c/${ids.normal}`);
	await page.getByText('A normal explanatory answer with no interactive block.', { exact: true }).waitFor({ timeout: 30000 });
	check('ordinary prose does not acquire native UI', await page.locator('input[type=range]').count() === 0);
	check('no chat-variable writes (no model-context leakage)', variableWrites === 0);
	if (errors.length) console.log(JSON.stringify({ browserErrors: errors }));
	check('zero unexpected console errors', errors.length === 0);
	console.log(JSON.stringify({ status: 'PASS', checks, consoleErrors: errors.length, modelCalls: 0 }, null, 2));
} finally {
	await browser.close();
	// Remove only synthetic fixtures created by this test.
	for (const id of Object.values(ids)) await fetch(`${API}/api/v1/chats/${id}`, {
		method: 'DELETE', headers: { authorization: `Bearer ${token}` }
	});
}
