import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-7');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m7ids.json', 'utf8'));

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

async function open(id, { theme, width, height }) {
	await page.evaluate((t) => localStorage.setItem('theme', t), theme);
	await page.setViewportSize({ width, height });
	await page.goto(`${BASE}/c/${id}`, { waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(2500);
}

await open(ids.partial, { theme: 'dark', width: 1280, height: 1000 });
const partialRendered = await page.getByText('Monthly', { exact: false }).count();
const rawLeak = await page.getByText('root = Stack', { exact: false }).count();
results.push(`partial rendered (Monthly): ${partialRendered}; raw code leaked: ${rawLeak}`);
await page.screenshot({ path: path.join(OUT, '01-streaming-partial.png'), fullPage: true });

await open(ids.complete, { theme: 'dark', width: 1280, height: 1000 });
const completeRendered = await page.getByText('Monthly', { exact: false }).count();
results.push(`complete rendered (Monthly): ${completeRendered}`);
await page.screenshot({ path: path.join(OUT, '02-streaming-complete.png'), fullPage: true });

await open(ids.complete, { theme: 'light', width: 390, height: 844 });
await page.screenshot({ path: path.join(OUT, '03-mobile.png'), fullPage: true });
await open(ids.partial, { theme: 'light', width: 1280, height: 1000 });
await page.screenshot({ path: path.join(OUT, '04-light-partial.png'), fullPage: true });
results.push('ok mobile + light');

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
