import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-9.5');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m95ids.json', 'utf8'));

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
	await page.waitForTimeout(3200);
}
const shot = (n) => page.screenshot({ path: path.join(OUT, n), fullPage: true });

// 01–03 pricing
await openChat(ids.pricing, 'dark');
await page.getByRole('tab', { name: 'Plans' }).first().waitFor({ timeout: 20000 }).catch(() => {});
await shot('01-pricing-dark.png');
await openChat(ids.pricing, 'light');
await shot('02-pricing-light.png');
await page.setViewportSize({ width: 390, height: 844 });
await openChat(ids.pricing, 'dark');
await shot('03-pricing-mobile.png');
await page.setViewportSize({ width: 1280, height: 1000 });

// 04 vps comparison
await openChat(ids.vps, 'dark');
await page.getByText('Compare plans').first().waitFor({ timeout: 20000 }).catch(() => {});
await shot('04-vps-comparison.png');

// 05–07 dashboard (analytics)
await openChat(ids.analytics, 'dark');
await page.getByRole('tab', { name: 'Overview' }).first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1000);
results.push(`dashboard chart canvas: ${await page.locator('canvas').count()}`);
await shot('05-dashboard-dark.png');
await openChat(ids.analytics, 'light');
await shot('06-dashboard-light.png');
await page.setViewportSize({ width: 390, height: 844 });
await openChat(ids.analytics, 'dark');
await shot('07-dashboard-mobile.png');
await page.setViewportSize({ width: 1280, height: 1000 });

// 08 query loading (delay the notes query)
await page.route('**/api/v1/notes/', async (route) => {
	await new Promise((r) => setTimeout(r, 2500));
	await route.continue();
});
await openChat(ids.querySuccess, 'dark');
await page.getByText('My notes').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(300);
results.push(`loading skeleton: ${await page.locator('[aria-busy=true]').count()}`);
await shot('08-query-loading.png');
// 09 query success (after load)
await page.getByText('My notes').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2800);
results.push(`notes table: ${await page.locator('table').count()}`);
await shot('09-query-success.png');
await page.unroute('**/api/v1/notes/');

// 10 query empty
await openChat(ids.queryEmpty, 'dark');
await page.getByText('No data').first().waitFor({ timeout: 20000 }).catch(() => {});
await shot('10-query-empty.png');

// 11 query error
await openChat(ids.queryError, 'dark');
await page.getByText('Couldn’t load this data').first().waitFor({ timeout: 20000 }).catch(() => {});
results.push(`query error shown: ${await page.getByText('Couldn’t load this data').count()}`);
await shot('11-query-error.png');

// 12–14 form + confirmation + success
await openChat(ids.form, 'dark');
await page.getByRole('button', { name: 'Save note' }).waitFor({ timeout: 20000 }).catch(() => {});
await shot('12-form.png');
await page.getByRole('button', { name: 'Save note' }).click();
await page.waitForTimeout(700);
results.push(`confirmation dialog: ${await page.locator('[role=dialog]').count()}`);
await shot('13-confirmation.png');
await page.getByRole('button', { name: /^Confirm$/ }).first().click();
await page.waitForTimeout(1400);
await shot('14-form-success.png');

// 15 timeline
await openChat(ids.timeline, 'dark');
await page.getByText('Milestones').first().waitFor({ timeout: 20000 }).catch(() => {});
await shot('15-timeline.png');

// 16 gallery
await openChat(ids.gallery, 'dark');
await page.getByText('Product shots').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);
results.push(`gallery figures: ${await page.locator('figure').count()}`);
await shot('16-gallery.png');

// 17 tabs mobile (pricing, calculator tab)
await page.setViewportSize({ width: 390, height: 844 });
await openChat(ids.pricing, 'dark');
await page.getByRole('tab', { name: 'Calculator' }).first().click().catch(() => {});
await page.waitForTimeout(500);
await shot('17-tabs-mobile.png');
await page.setViewportSize({ width: 1280, height: 1000 });

// 18 mixed response
await openChat(ids.mixed, 'dark');
await page.getByText('Compare plans', { exact: false }).first().waitFor({ timeout: 20000 }).catch(() => {});
await page.getByText('Best value').first().waitFor({ timeout: 20000 }).catch(() => {});
await shot('18-mixed-response.png');

// 19 streaming partial
await openChat(ids.streamPartial, 'dark');
await page.getByText('Revenue by quarter').first().waitFor({ timeout: 20000 }).catch(() => {});
results.push(`streaming partial canvas: ${await page.locator('canvas').count()}`);
await shot('19-streaming-partial.png');

// 20 streaming complete
await openChat(ids.streamComplete, 'dark');
await page.getByText('Revenue by quarter').first().waitFor({ timeout: 20000 }).catch(() => {});
await shot('20-streaming-complete.png');

// 21 rich widget chrome
await openChat(ids.rich, 'dark');
await page.getByText('Rich widget').first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1200);
results.push(`rich widget iframe: ${await page.locator('iframe').count()}`);
await shot('21-rich-widget-chrome.png');

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 6));
