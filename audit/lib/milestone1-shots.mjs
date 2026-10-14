import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'local/intelligent-ui/milestone-1');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';

const results = [];
const shot = async (page, name) => {
  try {
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    results.push(`saved ${name}.png`);
  } catch (e) {
    results.push(`FAILED screenshot ${name}: ${e.message.split('\n')[0]}`);
  }
};
const step = async (label, fn) => {
  try {
    await fn();
    results.push(`ok ${label}`);
  } catch (e) {
    results.push(`FAILED ${label}: ${e.message.split('\n')[0]}`);
  }
};

async function login(page) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function dismissDialogs(page) {
  const dialog = page.locator('[role=dialog]').first();
  if (await dialog.count()) {
    const okay = dialog.getByRole('button', { name: /Okay|Let's Go|Close/i }).first();
    if (await okay.count()) await okay.click().catch(() => {});
    await page.waitForTimeout(600);
  }
}

async function setGlobal(page, enabled) {
  return page.evaluate(async (enabled) => {
    const token = localStorage.token;
    const cur = await (
      await fetch('/api/v1/chats/config', { headers: { authorization: 'Bearer ' + token } })
    ).json();
    cur.ENABLE_INTELLIGENT_UI = enabled;
    const r = await fetch('/api/v1/chats/config', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify(cur)
    });
    return r.status;
  }, enabled);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

// ---- Desktop ----
let page = await context.newPage();
await login(page);
await setGlobal(page, true);

// Global OFF proof screenshot: /api/config feature value
const globalOff = await page.evaluate(async () => {
  const token = localStorage.token;
  const cfg = await (await fetch('/api/config', { headers: { authorization: 'Bearer ' + token } })).json();
  return cfg.features.enable_intelligent_ui;
});
results.push(`global enabled feature = ${globalOff}`);

// Admin setting
await step('admin global setting', async () => {
  await page.goto(`${BASE}/?settings=admin:interface`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.getByText('Intelligent UI', { exact: true }).first().scrollIntoViewIfNeeded();
  await shot(page, '01-admin-global-setting');
});

// User setting — deterministic: ensure OFF, screenshot, then turn ON
await page.goto(`${BASE}/?settings=interface`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const userSwitch = page.locator('[aria-labelledby="intelligent-ui-label"]');
await userSwitch.scrollIntoViewIfNeeded().catch(() => {});
await step('ensure user setting off', async () => {
  if ((await userSwitch.getAttribute('aria-checked')) === 'true') {
    await userSwitch.click();
    await page.waitForTimeout(1000);
  }
  await shot(page, '02-user-setting-off');
});
await step('toggle user setting on', async () => {
  await userSwitch.click();
  await page.waitForTimeout(1200);
  await shot(page, '03-user-setting-on');
});
await step('user setting persistence after reload', async () => {
  await page.goto(`${BASE}/?settings=interface`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const persisted = await page
    .locator('[aria-labelledby="intelligent-ui-label"]')
    .getAttribute('aria-checked');
  results.push(`user setting persisted after reload = ${persisted}`);
});

// Chat control — fresh page so no settings modal is open
await step('chat controls Auto/On/Off', async () => {
  const chat = await context.newPage();
  await login(chat);
  await chat.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await chat.waitForTimeout(2500);
  await dismissDialogs(chat);
  await chat.getByRole('button', { name: 'Controls' }).first().click();
  await chat.waitForTimeout(1500);
  await shot(chat, '04-chat-control-auto');
  const scope = chat.locator('div').filter({ hasText: 'Intelligent UI' }).last();
  await chat.getByRole('button', { name: 'On', exact: true }).first().click();
  await chat.waitForTimeout(800);
  await shot(chat, '05-chat-control-on');
  await chat.getByRole('button', { name: 'Off', exact: true }).first().click();
  await chat.waitForTimeout(800);
  await shot(chat, '06-chat-control-off');
  await chat.close();
});

// Dark mode
await step('dark mode user setting', async () => {
  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await page.goto(`${BASE}/?settings=interface`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('[aria-labelledby="intelligent-ui-label"]').scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, '07-user-setting-dark');
});

// ---- Mobile ----
await step('mobile user setting', async () => {
  const mob = await context.newPage();
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.goto(`${BASE}/?settings=interface`, { waitUntil: 'domcontentloaded' });
  await mob.waitForTimeout(2500);
  await mob.locator('[aria-labelledby="intelligent-ui-label"]').scrollIntoViewIfNeeded().catch(() => {});
  await shot(mob, '08-mobile-user-setting');
});

await browser.close();
console.log(results.join('\n'));
