import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-9');
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

await page.evaluate(() => localStorage.setItem('theme', 'dark'));
await page.goto(`${BASE}/c/${ids.html}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const frame = page.frameLocator('iframe');
const hasButton = await frame.getByRole('button', { name: /Clicked/ }).count();
results.push(`widget rendered (iframe button): ${hasButton}`);
await page.screenshot({ path: path.join(OUT, '01-html-widget.png'), fullPage: true });

// interact inside the sandboxed iframe
await frame.getByRole('button', { name: /Clicked/ }).click();
await page.waitForTimeout(400);
const afterClick = await frame.getByText('Clicked 1 times', { exact: false }).count();
results.push(`counter incremented: ${afterClick}`);
await page.screenshot({ path: path.join(OUT, '02-html-interacted.png'), fullPage: true });

// bridge: sendPrompt
await frame.getByRole('button', { name: /Send follow-up/ }).click();
await page.waitForTimeout(1500);
const sent = await page.getByText('Tell me more about this widget', { exact: false }).count();
results.push(`sendPrompt bridge produced a message: ${sent}`);
await page.screenshot({ path: path.join(OUT, '03-html-bridge.png'), fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => localStorage.setItem('theme', 'light'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, '04-html-mobile.png'), fullPage: true });

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
