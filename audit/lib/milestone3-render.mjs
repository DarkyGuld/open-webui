import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-3');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m3ids.json', 'utf8'));

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

async function shot(name, id, { theme = 'dark', width = 1280, height = 1000, expect, reload = false } = {}) {
	try {
		await page.evaluate((t) => localStorage.setItem('theme', t), theme);
		await page.setViewportSize({ width, height });
		await page.goto(`${BASE}/c/${id}`, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(2500);
		if (reload) {
			await page.reload({ waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(2500);
		}
		if (expect) {
			const n = await page.getByText(expect, { exact: false }).count();
			results.push(`${n > 0 ? 'ok' : 'MISSING'}: ${name} ("${expect}" -> ${n})`);
		} else {
			results.push(`ok ${name}`);
		}
		await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
	} catch (e) {
		results.push(`FAILED ${name}: ${e.message.split('\n')[0]}`);
	}
}

await shot('01-auto-markdown', ids.markdown, { theme: 'dark', expect: 'Nikola Tesla' });
await shot('02-auto-metric', ids.metric, { theme: 'dark', expect: 'Monthly payment' });
await shot('03-auto-comparison', ids.comparison, { theme: 'dark', expect: 'VPS plans' });
await shot('04-auto-table', ids.table, { theme: 'dark', expect: 'Monthly costs' });
await shot('05-on-comparison', ids.comparison2, { theme: 'dark', expect: 'Typical VPS tiers' });
await shot('06-invalid-fallback', ids.invalid, { theme: 'dark', expect: 'Intelligent UI unavailable' });
await shot('07-mobile', ids.comparison, { theme: 'light', width: 390, height: 844, expect: 'VPS plans' });
await shot('08-light', ids.comparison, { theme: 'light', expect: 'VPS plans' });
await shot('09-persisted-reload', ids.comparison, { theme: 'dark', expect: 'VPS plans', reload: true });

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
