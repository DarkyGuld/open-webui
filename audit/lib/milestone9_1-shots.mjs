import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-9.1');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m9ids.json', 'utf8'));

const results = [];
const errors = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e).split('\n')[0]));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('socket.io') && errors.push(m.text()));

await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
await page.fill('#email', EMAIL);
await page.fill('#password', PASSWORD);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(`${BASE}/`, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
const d = page.locator('[role=dialog]').first();
if (await d.count()) {
	const ok = d.getByRole('button', { name: /Okay|Let's Go|Close/i }).first();
	if (await ok.count()) await ok.click().catch(() => {});
	await page.waitForTimeout(400);
}

// 01: chat controls (both tri-states)
await page.evaluate(() => localStorage.setItem('theme', 'dark'));
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'Controls' }).first().click();
await page.waitForTimeout(1200);
const richCtrl = await page.getByText('Rich widgets', { exact: true }).count();
const nativeCtrl = await page.getByText('Intelligent UI', { exact: true }).count();
results.push(`controls visible -> native:${nativeCtrl} rich:${richCtrl}`);
await page.screenshot({ path: path.join(OUT, '01-chat-controls.png'), fullPage: true });
await page.keyboard.press('Escape').catch(() => {});

// 02: user settings rich toggle
await page.goto(`${BASE}/?settings=interface`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.locator('[aria-labelledby="rich-widgets-label"]').scrollIntoViewIfNeeded().catch(() => {});
await page.screenshot({ path: path.join(OUT, '02-user-setting-rich.png'), fullPage: true });

// 03: historical rich widget renders
await page.goto(`${BASE}/c/${ids.html}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const rendered = await page.frameLocator('iframe').getByRole('button', { name: /Clicked/ }).count();
results.push(`historical render (iframe button): ${rendered}`);
await page.screenshot({ path: path.join(OUT, '03-historical-render.png'), fullPage: true });

// 04: generation disabled (global html off) -> historical STILL renders
await page.evaluate(async () => {
	const token = localStorage.token;
	const cur = await (
		await fetch('/api/v1/chats/config', { headers: { authorization: 'Bearer ' + token } })
	).json();
	cur.ENABLE_INTELLIGENT_UI_HTML = false;
	await fetch('/api/v1/chats/config', {
		method: 'POST',
		headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
		body: JSON.stringify(cur)
	});
});
await page.goto(`${BASE}/c/${ids.html}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const stillRenders = await page.frameLocator('iframe').getByRole('button', { name: /Clicked/ }).count();
results.push(`historical render with generation OFF: ${stillRenders}`);
await page.screenshot({ path: path.join(OUT, '04-historical-when-off.png'), fullPage: true });

// restore global html ON
await page.evaluate(async () => {
	const token = localStorage.token;
	const cur = await (
		await fetch('/api/v1/chats/config', { headers: { authorization: 'Bearer ' + token } })
	).json();
	cur.ENABLE_INTELLIGENT_UI_HTML = true;
	await fetch('/api/v1/chats/config', {
		method: 'POST',
		headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
		body: JSON.stringify(cur)
	});
});

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
