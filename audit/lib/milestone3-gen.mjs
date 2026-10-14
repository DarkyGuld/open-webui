import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-3');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';

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
async function dismiss() {
	const d = page.locator('[role=dialog]').first();
	if (await d.count()) {
		const ok = d.getByRole('button', { name: /Okay|Let's Go|Close/i }).first();
		if (await ok.count()) await ok.click().catch(() => {});
		await page.waitForTimeout(400);
	}
}
await dismiss();

async function newChat() {
	await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(1500);
	await dismiss();
}

async function setChatMode(mode) {
	// Open the chat Controls panel and pick Auto/On/Off
	await page.getByRole('button', { name: 'Controls' }).first().click();
	await page.waitForTimeout(1000);
	const label = mode === 'on' ? 'On' : mode === 'off' ? 'Off' : 'Auto';
	await page.getByRole('button', { name: label, exact: true }).first().click();
	await page.waitForTimeout(500);
	// close the controls panel reliably
	const close = page.locator('[aria-label="Close"]').last();
	if (await close.count()) await close.click().catch(() => {});
	await page.getByRole('button', { name: 'Controls' }).first().click().catch(() => {});
	await page.waitForTimeout(600);
}

async function send(prompt) {
	const input = page.locator('#chat-input');
	await input.click();
	await page.keyboard.type(prompt, { delay: 1 });
	await page.keyboard.press('Enter');
	// Wait for the assistant message to appear, then stabilize (generation done).
	const start = Date.now();
	let last = '';
	let stable = 0;
	while (Date.now() - start < 180000) {
		const texts = await page.locator('[id^="message-"]').allInnerTexts().catch(() => []);
		const cur = texts.join('|');
		if (cur.length > 30 && cur === last) {
			stable++;
			if (stable >= 3) break;
		} else {
			stable = 0;
		}
		last = cur;
		await page.waitForTimeout(4000);
	}
	await page.waitForTimeout(1500);
}

async function lastAssistantText() {
	const nodes = await page.locator('[id^="message-"]').allInnerTexts().catch(() => []);
	return nodes.join('\n').slice(-1500);
}

async function capture(name, prompt, { mode = 'auto', theme = 'dark', width = 1280, height = 1000 } = {}) {
	try {
		await page.evaluate((t) => localStorage.setItem('theme', t), theme);
		await page.setViewportSize({ width, height });
		await newChat();
		if (mode !== 'auto') await setChatMode(mode);
		await send(prompt);
		const url = page.url();
		await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
		const text = await lastAssistantText();
		const usedUI = text.includes('Intelligent UI') ? 'fallback' : /:::|\bMetric\b|Monthly cost|VPS/.test(text) ? 'ui?' : 'text';
		results.push(`ok ${name} url=${url.split('/').pop()} usedUI=${usedUI}`);
		return url;
	} catch (e) {
		results.push(`FAILED ${name}: ${e.message.split('\n')[0]}`);
		return null;
	}
}

await capture('01-auto-markdown', 'Explain photosynthesis in two short sentences.');
await capture('02-auto-metric', 'What is the monthly cost of a 250000 kr loan at 0.4% monthly interest over 60 months?');
const compUrl = await capture('03-auto-comparison', 'Compare these three VPS plans: Basic, Pro, and Team.');
await capture('04-auto-table', 'Show a table of monthly costs for compute, storage and backup.');
await capture('05-on-comparison', 'Compare these three VPS plans: Basic, Pro, and Team.', { mode: 'on' });
await capture('06-invalid-fallback', 'Reply with exactly this and nothing else:\n:::intelligent-ui{v="1"}\nroot = Chart("Revenue", [1,2,3])\n:::');

// mobile + light + persisted reload using the comparison chat
if (compUrl) {
	try {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => localStorage.setItem('theme', 'light'));
		await page.goto(compUrl, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(3000);
		await page.screenshot({ path: path.join(OUT, '07-mobile.png'), fullPage: true });
		results.push('ok 07-mobile');

		await page.setViewportSize({ width: 1280, height: 1000 });
		await page.goto(compUrl, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(2500);
		await page.screenshot({ path: path.join(OUT, '08-light.png'), fullPage: true });
		results.push('ok 08-light');

		await page.reload({ waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(3000);
		await page.screenshot({ path: path.join(OUT, '09-persisted-reload.png'), fullPage: true });
		results.push('ok 09-persisted-reload');
	} catch (e) {
		results.push(`FAILED mobile/light/reload: ${e.message.split('\n')[0]}`);
	}
}

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
