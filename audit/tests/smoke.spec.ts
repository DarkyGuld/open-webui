import { test, expect } from '@playwright/test';

/**
 * Phase-0 smoke test: verifies the local app and upstream Open WebUI render
 * without critical console errors. This is a setup sanity check, not the
 * full UI audit (which happens in the next phase).
 */
test.describe('smoke', () => {
  test('local app loads and renders', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));

    const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();

    // Allow the SPA to mount, then assert nothing catastrophic broke.
    await page.waitForTimeout(1000);
    expect(errors, `console errors:\n${errors.join('\n')}`).toHaveLength(0);
  });
});
