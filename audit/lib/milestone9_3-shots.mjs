import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-9.3');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m93ids.json', 'utf8'));

const results = [];
const errors = [];
let mutationPosts = 0;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e).split('\n')[0]));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('socket.io') && errors.push(m.text()));
page.on('request', (r) => {
	if (r.url().includes('/api/v1/notes/create') && r.method() === 'POST') mutationPosts++;
});

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

// 01 loading: delay the notes query
await page.route('**/api/v1/notes/', async (route) => {
	await new Promise((r) => setTimeout(r, 1500));
	await route.continue();
});
await page.goto(`${BASE}/c/${ids.notes}`, { waitUntil: 'domcontentloaded' });
await page.getByText('My notes', { exact: false }).first().waitFor({ timeout: 20000 }).catch(()=>{});
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, '01-query-loading.png'), fullPage: true });
await page.getByText('Seed note', { exact: false }).first().waitFor({ timeout: 15000 }).catch(()=>{});
results.push(`notes success rows: ${await page.getByText('Seed note', { exact: false }).count()}`);
await page.screenshot({ path: path.join(OUT, '02-query-success.png'), fullPage: true });
await page.unroute('**/api/v1/notes/');

// 03 empty
await page.goto(`${BASE}/c/${ids.knowledge}`, { waitUntil: 'domcontentloaded' });
await page.getByText('No data', { exact: false }).first().waitFor({ timeout: 20000 }).catch(()=>{});
results.push(`empty state shown: ${await page.getByText('No data', { exact: false }).count()}`);
await page.screenshot({ path: path.join(OUT, '03-query-empty.png'), fullPage: true });

// 04 error
await page.goto(`${BASE}/c/${ids.error}`, { waitUntil: 'domcontentloaded' });
await page.getByText('Could not load data', { exact: false }).first().waitFor({ timeout: 20000 }).catch(()=>{});
results.push(`error state shown: ${await page.getByText('Could not load data', { exact: false }).count()}`);
await page.screenshot({ path: path.join(OUT, '04-query-error.png'), fullPage: true });

// 05 reactive UI (notes + reuse)
await page.goto(`${BASE}/c/${ids.notes}`, { waitUntil: 'domcontentloaded' });
await page.getByText('My notes', { exact: false }).first().waitFor({ timeout: 20000 }).catch(()=>{});
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, '05-query-reactive-ui.png'), fullPage: true });

// 06 mutation confirmation
await page.goto(`${BASE}/c/${ids.mutation}`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Save note' }).waitFor({ timeout: 20000 }).catch(()=>{});
const before = mutationPosts;
await page.getByRole('button', { name: 'Save note' }).click();
await page.waitForTimeout(800);
results.push(`confirmation dialog: ${await page.locator('[role=dialog]').count()}`);
await page.screenshot({ path: path.join(OUT, '06-mutation-confirmation.png'), fullPage: true });

// 07 cancelled
await page.getByRole('button', { name: /Cancel/i }).first().click();
await page.waitForTimeout(600);
results.push(`cancelled -> no POST: ${mutationPosts === before}`);
await page.screenshot({ path: path.join(OUT, '07-mutation-cancelled.png'), fullPage: true });

// 08 success (confirm)
await page.getByRole('button', { name: 'Save note' }).click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /^Confirm$/ }).first().click();
await page.waitForTimeout(1200);
results.push(`confirmed -> POST happened: ${mutationPosts > before}`);
await page.screenshot({ path: path.join(OUT, '08-mutation-success.png'), fullPage: true });

// 09 permission denied (force 403)
await page.route('**/api/v1/notes/create', async (route) => {
	await route.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
});
const beforeDenied = mutationPosts;
await page.getByRole('button', { name: 'Save note' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /^Confirm$/ }).first().click();
await page.waitForTimeout(800);
results.push(`denied -> no crash (dialog closed): ${await page.locator('[role=dialog]').count()}`);
await page.screenshot({ path: path.join(OUT, '09-mutation-permission-denied.png'), fullPage: true });
await page.unroute('**/api/v1/notes/create');

// 10 reload no replay
const beforeReload = mutationPosts;
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
results.push(`reload -> no replay POST: ${mutationPosts === beforeReload}`);
await page.screenshot({ path: path.join(OUT, '10-reload-no-replay.png'), fullPage: true });

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
