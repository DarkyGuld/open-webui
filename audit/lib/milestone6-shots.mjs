import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-6');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m6ids.json', 'utf8'));

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

async function open({ theme, width, height }) {
	await page.evaluate((t) => localStorage.setItem('theme', t), theme);
	await page.setViewportSize({ width, height });
	await page.goto(`${BASE}/c/${ids.calc}`, { waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(2500);
}

await open({ theme: 'dark', width: 1280, height: 1000 });
await page.screenshot({ path: path.join(OUT, '01-calculator-default.png'), fullPage: true });
const before = await page.getByText('232', { exact: false }).count();
results.push(`default shows 232: ${before}`);

// Interact: move the slider to 20 -> expect 580 (no model call)
await page.$eval('input[type=range]', (el) => {
	el.value = '20';
	el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(800);
const after = await page.getByText('580', { exact: false }).count();
results.push(`after slider=20 shows 580: ${after}`);
await page.screenshot({ path: path.join(OUT, '02-calculator-interacted.png'), fullPage: true });

await open({ theme: 'light', width: 1280, height: 1000 });
await page.screenshot({ path: path.join(OUT, '03-light.png'), fullPage: true });
await open({ theme: 'light', width: 390, height: 844 });
await page.screenshot({ path: path.join(OUT, '04-mobile.png'), fullPage: true });
results.push('ok light + mobile');

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
