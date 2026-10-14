import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-2');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/iuids.json', 'utf8'));

const results = [];
const errors = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e).split('\n')[0]));
page.on('console', (m) => {
	if (m.type() === 'error' && !m.text().includes('socket.io')) errors.push(m.text());
});

await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
await page.fill('#email', EMAIL);
await page.fill('#password', PASSWORD);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(`${BASE}/`, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);

async function capture(name, id, { theme = 'dark', width = 1440, height = 1000, expect } = {}) {
	try {
		await page.evaluate((t) => localStorage.setItem('theme', t), theme);
		await page.setViewportSize({ width, height });
		await page.goto(`${BASE}/c/${id}`, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(3000);
		if (expect) {
			const found = await page.getByText(expect, { exact: false }).count();
			results.push(`${found > 0 ? 'ok' : 'MISSING'}: ${name} (expect "${expect}" -> ${found})`);
		}
		await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
	} catch (e) {
		results.push(`FAILED ${name}: ${e.message.split('\n')[0]}`);
	}
}

await capture('01-metric-dark', ids.metric, { theme: 'dark', expect: 'Monthly cost' });
await capture('02-metric-light', ids.metric, { theme: 'light', expect: 'Monthly cost' });
await capture('03-comparison-dark', ids.comparison, { theme: 'dark', expect: 'VPS comparison' });
await capture('04-comparison-mobile', ids.comparison, { theme: 'light', width: 390, height: 844, expect: 'VPS comparison' });
await capture('05-table-dark', ids.table, { theme: 'dark', expect: 'Monthly costs' });
await capture('06-table-mobile', ids.table, { theme: 'light', width: 390, height: 844, expect: 'Monthly costs' });
await capture('07-invalid-fallback', ids.invalid, { theme: 'dark', expect: 'Intelligent UI unavailable' });

// Persistence / reload: open metric, reload, screenshot again
await page.evaluate(() => localStorage.setItem('theme', 'dark'));
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${BASE}/c/${ids.metric}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const persistedFound = await page.getByText('Monthly cost', { exact: false }).count();
results.push(`persisted-reload metric found = ${persistedFound}`);
await page.screenshot({ path: path.join(OUT, '08-persisted-reload.png'), fullPage: true });

await browser.close();
console.log(results.join('\n'));
console.log('console/page errors (excl socket):', errors.length, errors.slice(0, 5));
