import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-5');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m5ids.json', 'utf8'));

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

async function shot(name, { theme, width, height }) {
	try {
		await page.evaluate((t) => localStorage.setItem('theme', t), theme);
		await page.setViewportSize({ width, height });
		await page.goto(`${BASE}/c/${ids.layout}`, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(2500);
		const found = await page.getByText('Cost breakdown', { exact: false }).count();
		results.push(`${found > 0 ? 'ok' : 'MISSING'}: ${name}`);
		await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
	} catch (e) {
		results.push(`FAILED ${name}: ${e.message.split('\n')[0]}`);
	}
}

await shot('01-layout-dark', { theme: 'dark', width: 1280, height: 1000 });
await shot('02-layout-light', { theme: 'light', width: 1280, height: 1000 });
await shot('03-layout-mobile', { theme: 'light', width: 390, height: 844 });

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
