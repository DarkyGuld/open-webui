import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-4');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const ids = JSON.parse(fs.readFileSync('/tmp/m4ids.json', 'utf8'));

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

async function open(id, { theme = 'dark', width = 1280, height = 1000 } = {}) {
	await page.evaluate((t) => localStorage.setItem('theme', t), theme);
	await page.setViewportSize({ width, height });
	await page.goto(`${BASE}/c/${id}`, { waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(2500);
}
const shot = async (name) => {
	await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
};
const step = async (label, fn) => {
	try {
		await fn();
		results.push(`ok ${label}`);
	} catch (e) {
		results.push(`FAILED ${label}: ${e.message.split('\n')[0]}`);
	}
};

// 01 default + 02 selected + 05 before reload + 06 after reload
await open(ids.comparison);
await step('01-comparison-default', async () => {
	await shot('01-comparison-default');
});
await step('02-comparison-selected', async () => {
	await page.getByText('Pro', { exact: true }).first().click();
	await page.waitForTimeout(600);
	const pressed = await page.locator('[aria-pressed="true"]').count();
	results.push(`  selected aria-pressed=true count=${pressed}`);
	await shot('02-comparison-selected');
});
await step('05-state-before-reload', async () => {
	await shot('05-state-before-reload');
});
await step('06-state-after-reload', async () => {
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(2500);
	const pressed = await page.locator('[aria-pressed="true"]').count();
	results.push(`  after reload aria-pressed=true count=${pressed}`);
	await shot('06-state-after-reload');
});

// 03 send_prompt action
await step('03-send-prompt-action', async () => {
	await open(ids.comparison);
	await page.getByRole('button', { name: /Compare these plans by yearly cost/ }).first().click();
	await page.waitForTimeout(1500);
	const found = await page.getByText('Compare these plans by yearly cost', { exact: false }).count();
	results.push(`  prompt appears in chat: ${found}`);
	await shot('03-send-prompt-action');
});

// 04 confirmation dialog
await step('04-confirmation-dialog', async () => {
	await open(ids.confirm);
	await page.getByRole('button', { name: /Delete the workspace\?/ }).first().click();
	await page.waitForTimeout(800);
	const dialogs = await page.locator('[role=dialog]').count();
	results.push(`  dialogs visible: ${dialogs}`);
	await shot('04-confirmation-dialog');
	await page.keyboard.press('Escape').catch(() => {});
});

// 07 invalid fallback
await step('07-invalid-action-fallback', async () => {
	await open(ids.invalid);
	const found = await page.getByText('Intelligent UI unavailable', { exact: false }).count();
	results.push(`  fallback present: ${found}`);
	await shot('07-invalid-action-fallback');
});

// 08 mobile, 09 dark, 10 light
await step('08-mobile-interaction', async () => {
	await open(ids.comparison, { theme: 'light', width: 390, height: 844 });
	await shot('08-mobile-interaction');
});
await step('09-dark', async () => {
	await open(ids.comparison, { theme: 'dark' });
	await shot('09-dark');
});
await step('10-light', async () => {
	await open(ids.comparison, { theme: 'light' });
	await shot('10-light');
});

await browser.close();
console.log(results.join('\n'));
console.log('errors(excl socket):', errors.length, errors.slice(0, 5));
