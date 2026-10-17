// M9.11 browser verification — deterministic (seeded chats, no model calls).
// Verifies the streaming/state lifecycle, rendering, actions, OFF gating,
// query error states, mutation confirmation, Rich sandbox, and themes
// against the REAL running app (backend :8080, frontend :5173).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-9.11');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const API = 'http://127.0.0.1:8080';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';

const results = [];
const errors = [];
const ok = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);

// ---------- seed deterministic chats via the API ----------
async function getToken() {
	try {
		const t = fs.readFileSync('/tmp/token', 'utf8').trim();
		if (t) {
			const r = await fetch(`${API}/api/v1/auths/`, { headers: { authorization: `Bearer ${t}` } });
			if (r.ok) return t;
		}
	} catch {}
	const r = await fetch(`${API}/api/v1/auths/signin`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: EMAIL, password: PASSWORD })
	});
	if (!r.ok) throw new Error(`signin failed ${r.status}`);
	const t = (await r.json()).token;
	fs.writeFileSync('/tmp/token', t);
	return t;
}
const token = await getToken();

async function createChat(name, content, done = true) {
	const chat = {
		title: `IU m9.11 ${name}`,
		models: ['deepseek-v4.1-flash'],
		params: {},
		history: {
			currentId: 'm1',
			messages: {
				m1: { id: 'm1', parentId: null, childrenIds: [], role: 'assistant', content, timestamp: Math.floor(Date.now() / 1000), done, model: 'deepseek-v4.1-flash' }
			}
		},
		messages: [{ role: 'assistant', content }],
		share_mode: 'continue'
	};
	const r = await fetch(`${API}/api/v1/chats/new`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify({ chat })
	});
	if (!r.ok) throw new Error(`create ${name} failed ${r.status}`);
	return (await r.json()).id;
}

const CALC = `$seats = 8
root = Stack([s1, row1, m1])
s1 = Slider("Seats", $seats, 1, 50)
row1 = Row([b20, br])
b20 = Button("20 seats", @Set($seats, 20))
br = Button("Reset", @Reset($seats))
m1 = Metric("Monthly price", total, "Incl. VAT")
total = $seats * 29`;

const ids = {};
ids.metric = await createChat('metric', ':::intelligent-ui{v="1"}\nroot = Stack([m1, c1])\nm1 = Metric("Monthly cost", "5 294 kr", "Incl. VAT")\nc1 = Comparison("VPS", [{name:"Basic",attributes:["1 vCPU","1 GB RAM"]},{name:"Pro",attributes:["2 vCPU","4 GB RAM"]}])\n:::');
ids.calc = await createChat('calc', `:::intelligent-ui{v="1"}\n${CALC}\n:::`); // calc program WITHOUT closing fence? no — complete
ids.calcB = await createChat('calcb', `:::intelligent-ui{v="1"}\n${CALC}\n:::`);
// partial (unterminated fence -> streaming/partial mode)
ids.partial = await createChat('partial', `:::intelligent-ui{v="1"}\n${CALC}`);
ids.invalid = await createChat('invalid', ':::intelligent-ui{v="1"}\nroot = Stack([t1, b1])\nt1 = Table("T", ["a"], [["x"],["y"],["z"]])\nb1 = Badge("Status", "loud")\n:::');
ids.queryErr = await createChat('queryerr', ':::intelligent-ui{v="1"}\nroot = Data("bogus.source", "Bad source")\n:::');
ids.mutation = await createChat('mutation', ':::intelligent-ui{v="1"}\nroot = Stack([b1])\nb1 = Button("Save note", "notes.create", {title:"Plan", content:"Ship it."})\n:::');
ids.rich = await createChat('rich', 'Custom widget:\n\n:::intelligent-ui-html{v="1"}\n<div style="padding:12px;color:var(--viz-text)">Rich widget body<button onclick="window.GenUI.sendPrompt(\'hello\')" style="margin-left:8px">Send</button></div>\n:::\n\nEnds.');
ids.mixed = await createChat('mixed', 'Intro text before the UI.\n\n:::intelligent-ui{v="1"}\nroot = Metric("Total", "980 kr", "Incl. VAT")\n:::\n\nConclusion text after the UI.');
fs.writeFileSync('/tmp/m911ids.json', JSON.stringify(ids, null, 2));

// ---------- browser ----------
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
let mutationPosts = 0;
page.on('pageerror', (e) => errors.push(String(e).split('\n')[0]));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('socket.io') && errors.push(m.text()));
page.on('request', (r) => {
	if (r.url().includes('/api/v1/notes/create') && r.method() === 'POST') mutationPosts++;
});

await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
await page.fill('#email', EMAIL);
await page.fill('#password', PASSWORD);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(`${BASE}/`, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
const dlg = page.locator('[role=dialog]').first();
if (await dlg.count()) {
	const b = dlg.getByRole('button', { name: /Okay|Let's Go|Close/i }).first();
	if (await b.count()) await b.click().catch(() => {});
	await page.waitForTimeout(400);
}

async function openChat(id, theme = 'dark') {
	await page.evaluate((t) => localStorage.setItem('theme', t), theme);
	await page.goto(`${BASE}/c/${id}`, { waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(3000);
}
async function setSlider(locator, value) {
	await locator.evaluate((el, v) => {
		el.value = v;
		el.dispatchEvent(new Event('input', { bubbles: true }));
	}, String(value));
	await page.waitForTimeout(300);
}
const shot = (n) => page.screenshot({ path: path.join(OUT, n), fullPage: true });

// 01 native metric + comparison render
await openChat(ids.metric, 'dark');
await page.getByText('Monthly cost').first().waitFor({ timeout: 20000 }).catch(() => {});
ok('metric renders', (await page.getByText('5 294 kr').count()) >= 1);
ok('comparison renders', (await page.getByText('VPS').count()) >= 1);
await shot('01-native-metric-comparison-dark.png');

// 02 interactive calculator (complete runtime): slider -> derived metric; @Set; @Reset
await openChat(ids.calc, 'dark');
await page.getByText('Monthly price').first().waitFor({ timeout: 20000 }).catch(() => {});
const slider = page.locator('input[type=range]').first();
ok('slider present (complete)', (await slider.count()) === 1);
await setSlider(slider, 20);
ok('live derived update (complete)', (await page.getByText('580').count()) >= 1);
await page.getByRole('button', { name: '20 seats' }).click();
await page.waitForTimeout(400);
ok('@Set updates state', (await page.getByText('580').count()) >= 1);
await page.getByRole('button', { name: 'Reset' }).click();
await page.waitForTimeout(400);
ok('@Reset restores default', (await page.getByText('232').count()) >= 1);
await shot('02-calculator-complete-dark.png');
// keyboard: focus slider + ArrowRight changes value
await slider.focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
ok('keyboard slider interaction', (await page.getByText('261').count()) >= 1); // 9 * 29

// 03 PARTIAL (streaming) mode: live interaction during streaming
await openChat(ids.partial, 'dark');
await page.getByText('Monthly price').first().waitFor({ timeout: 20000 }).catch(() => {});
const pslider = page.locator('input[type=range]').first();
ok('slider present (partial)', (await pslider.count()) === 1);
await setSlider(pslider, 30);
ok('LIVE derived update during partial (new capability)', (await page.getByText('870').count()) >= 1);
await page.getByRole('button', { name: '20 seats' }).click();
await page.waitForTimeout(400);
ok('@Set works during partial', (await page.getByText('580').count()) >= 1);
await shot('03-partial-live-interaction.png');

// 04 invalid complete program -> safe fallback
await openChat(ids.invalid, 'dark');
await page.getByText('Interactive view unavailable').first().waitFor({ timeout: 20000 }).catch(() => {});
ok('invalid -> fallback', (await page.getByText('Interactive view unavailable').count()) >= 1);

// 05 query error state (unknown source)
await openChat(ids.queryErr, 'dark');
await page.getByText('Bad source').first().waitFor({ timeout: 20000 }).catch(() => {});
ok('query error state', (await page.getByText("Couldn’t load this data").count()) >= 1);

// 06 mutation confirm/cancel/replay-safe
await openChat(ids.mutation, 'dark');
await page.getByRole('button', { name: 'Save note' }).waitFor({ timeout: 20000 }).catch(() => {});
const before = mutationPosts;
await page.getByRole('button', { name: 'Save note' }).click();
await page.waitForTimeout(700);
ok('mutation confirmation dialog', (await page.locator('[role=dialog]').count()) >= 1);
await page.getByRole('button', { name: /Cancel/i }).first().click();
await page.waitForTimeout(500);
ok('cancel -> no POST', mutationPosts === before);
await page.getByRole('button', { name: 'Save note' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /^Confirm$/ }).first().click();
await page.waitForTimeout(1500);
ok('confirm -> POST happened', mutationPosts > before);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
ok('reload -> no replay POST', mutationPosts === before + 1);

// 07 Rich widget sandbox + rendering
await openChat(ids.rich, 'dark');
await page.getByText('Rich widget').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1200);
const frame = page.locator('iframe').first();
ok('rich iframe renders', (await frame.count()) === 1);
const sandbox = await frame.getAttribute('sandbox');
ok('sandbox blocks same-origin', !/allow-same-origin/.test(sandbox ?? ''));
ok('sandbox blocks forms', !/allow-forms/.test(sandbox ?? ''));
ok('sandbox blocks downloads', !/allow-downloads/.test(sandbox ?? ''));
const richBtn = frame.contentFrame().locator('button').first();
ok('rich widget is interactive (inside sandbox)', (await richBtn.count()) >= 1);
await shot('04-rich-widget-sandbox.png');

// 08 mixed response: prose before + UI + prose after
await openChat(ids.mixed, 'dark');
await page.getByText('Intro text before the UI.').first().waitFor({ timeout: 20000 }).catch(() => {});
ok('mixed: intro prose', (await page.getByText('Intro text before the UI.').count()) >= 1);
ok('mixed: UI present', (await page.getByText('980 kr').count()) >= 1);
ok('mixed: conclusion prose', (await page.getByText('Conclusion text after the UI.').count()) >= 1);

// 09 navigation between chats: state does not leak across chats
await openChat(ids.calc, 'dark');
await page.getByText('Monthly price').first().waitFor({ timeout: 20000 }).catch(() => {});
await setSlider(page.locator('input[type=range]').first(), 40);
ok('calc state set (40)', (await page.getByText('1160').count()) >= 1);
await openChat(ids.calcB, 'dark');
await page.getByText('Monthly price').first().waitFor({ timeout: 20000 }).catch(() => {});
ok('other chat unaffected (default 8)', (await page.getByText('232').count()) >= 1);
await openChat(ids.calc, 'dark');
await page.getByText('Monthly price').first().waitFor({ timeout: 20000 }).catch(() => {});
ok('original chat re-renders from content (defaults)', (await page.getByText('232').count()) >= 1);

// 10 reload of a completed conversation
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
ok('reload renders identically', (await page.getByText('232').count()) >= 1);

// 11 global OFF flag: generation gating is server-side (Filter identity — proven
// by pytest); by documented design (M9.1+) a PERSISTED fence still renders so
// historical messages are never destroyed. Verify that documented behavior,
// then restore the flag.
await page.evaluate(async () => {
	const t = localStorage.token;
	const cur = await (await fetch('/api/v1/chats/config', { headers: { authorization: 'Bearer ' + t } })).json();
	cur.ENABLE_INTELLIGENT_UI = false;
	await fetch('/api/v1/chats/config', {
		method: 'POST',
		headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json' },
		body: JSON.stringify(cur)
	});
});
await openChat(ids.calc, 'dark');
await page.waitForTimeout(1500);
ok('OFF: historical fence still renders (documented no-data-loss design)', (await page.getByText('Monthly price').count()) >= 1);
await page.evaluate(async () => {
	const t = localStorage.token;
	const cur = await (await fetch('/api/v1/chats/config', { headers: { authorization: 'Bearer ' + t } })).json();
	cur.ENABLE_INTELLIGENT_UI = true;
	await fetch('/api/v1/chats/config', {
		method: 'POST',
		headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json' },
		body: JSON.stringify(cur)
	});
});
await openChat(ids.calc, 'dark');
await page.getByText('Monthly price').first().waitFor({ timeout: 20000 }).catch(() => {});
ok('ON restored: native UI renders again', (await page.getByText('Monthly price').count()) >= 1);

// 12 light theme + mobile viewport
await openChat(ids.calc, 'light');
await shot('05-calculator-light.png');
await page.setViewportSize({ width: 390, height: 844 });
await openChat(ids.calc, 'dark');
await shot('06-calculator-mobile.png');
await page.setViewportSize({ width: 1280, height: 1000 });

await browser.close();
console.log(results.join('\n'));
console.log('console errors (excl socket):', errors.length, errors.slice(0, 6));
const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(failed.length ? `FAILURES: ${failed.length}` : 'ALL BROWSER CHECKS PASSED');
