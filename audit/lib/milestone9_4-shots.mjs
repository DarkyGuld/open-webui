import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-9.4');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m94ids.json', 'utf8'));

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
const dlg = page.locator('[role=dialog]').first();
if (await dlg.count()) {
	const ok = dlg.getByRole('button', { name: /Okay|Let's Go|Close/i }).first();
	if (await ok.count()) await ok.click().catch(() => {});
	await page.waitForTimeout(400);
}

async function openChat(id, theme = 'dark') {
	await page.evaluate((t) => localStorage.setItem('theme', t), theme);
	await page.goto(`${BASE}/c/${id}`, { waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(3500);
}

// 01 dashboard (dark)
await openChat(ids.dashboard, 'dark');
await page.getByText('Revenue by quarter').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1200);
results.push(`dashboard chart canvas: ${await page.locator('canvas').count()}`);
await page.screenshot({ path: path.join(OUT, '01-dashboard-dark.png'), fullPage: true });

// 02 dashboard (light)
await openChat(ids.dashboard, 'light');
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, '02-dashboard-light.png'), fullPage: true });

// 03 dashboard (mobile)
await page.setViewportSize({ width: 390, height: 844 });
await openChat(ids.dashboard, 'dark');
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, '03-dashboard-mobile.png'), fullPage: true });
await page.setViewportSize({ width: 1280, height: 1000 });

// 04 tabs
await openChat(ids.pricing, 'dark');
await page.getByRole('tab', { name: 'Plans' }).waitFor({ timeout: 20000 }).catch(() => {});
const tabCount = await page.getByRole('tab').count();
results.push(`tabs: ${tabCount}`);
await page.screenshot({ path: path.join(OUT, '04-tabs.png'), fullPage: true });

// 05 chart (element)
await openChat(ids.dashboard, 'dark');
await page.locator('canvas').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1200);
await page
	.locator('canvas')
	.first()
	.screenshot({ path: path.join(OUT, '05-chart.png') })
	.catch(async () => page.screenshot({ path: path.join(OUT, '05-chart.png'), fullPage: true }));

// 06 chart query-backed (analytics)
await openChat(ids.analytics, 'dark');
await page.locator('canvas').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await page
	.locator('canvas')
	.first()
	.screenshot({ path: path.join(OUT, '06-chart-query-backed.png') })
	.catch(async () => page.screenshot({ path: path.join(OUT, '06-chart-query-backed.png'), fullPage: true }));

// 07 progress
await page.locator('[role=progressbar]').first().waitFor({ timeout: 20000 }).catch(() => {});
results.push(`progressbar: ${await page.locator('[role=progressbar]').count()}`);
await page
	.locator('[role=progressbar]')
	.first()
	.screenshot({ path: path.join(OUT, '07-progress.png') })
	.catch(async () => page.screenshot({ path: path.join(OUT, '07-progress.png'), fullPage: true }));

// 08 timeline
await page.getByText('Recent activity').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.screenshot({ path: path.join(OUT, '08-timeline.png'), fullPage: true });

// 09 gallery
await openChat(ids.gallery, 'dark');
await page.getByText('Screenshots').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1200);
results.push(`gallery figures: ${await page.locator('figure').count()}`);
await page.screenshot({ path: path.join(OUT, '09-gallery.png'), fullPage: true });

// 10 form
await openChat(ids.form, 'dark');
await page.getByRole('button', { name: 'Save note' }).waitFor({ timeout: 20000 }).catch(() => {});
results.push(`form radios: ${await page.locator('input[type=radio]').count()}`);
await page.screenshot({ path: path.join(OUT, '10-form.png'), fullPage: true });

// 11 form confirmation
await page.getByRole('button', { name: 'Save note' }).click();
await page.waitForTimeout(800);
results.push(`form confirmation dialog: ${await page.locator('[role=dialog]').count()}`);
await page.screenshot({ path: path.join(OUT, '11-form-confirmation.png'), fullPage: true });
await page.getByRole('button', { name: /Cancel/i }).first().click().catch(() => {});

// 12 nested layout
await openChat(ids.nested, 'dark');
await page.getByText('Outer').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.screenshot({ path: path.join(OUT, '12-nested-layout.png'), fullPage: true });

// 13 invalid-limit fallback
await openChat(ids.invalid, 'dark');
await page.getByText('Intelligent UI unavailable').first().waitFor({ timeout: 20000 }).catch(() => {});
results.push(`fallback shown: ${await page.getByText('Intelligent UI unavailable').count()}`);
await page.screenshot({ path: path.join(OUT, '13-invalid-limit-fallback.png'), fullPage: true });

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 6));
