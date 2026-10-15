import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-8');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m8ids.json', 'utf8'));

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

await page.evaluate(() => localStorage.setItem('theme', 'dark'));
await page.goto(`${BASE}/c/${ids.each}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const count = await page.getByText('Deploy', { exact: true }).count();
results.push(`@Each rendered last item (Deploy): ${count}`);
await page.screenshot({ path: path.join(OUT, '01-each-loop.png'), fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => localStorage.setItem('theme', 'light'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(OUT, '02-each-mobile.png'), fullPage: true });

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
