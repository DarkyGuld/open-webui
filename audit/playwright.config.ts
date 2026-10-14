import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration tuned for UI/UX auditing:
 * - desktop + mobile viewport presets
 * - video + trace recording
 * - console/network diagnostics (see tests for fixtures)
 *
 * Set HEADLESS=false to watch runs. Set AUDIT_CHANNEL=chrome to use system Chrome.
 */
const LOCAL_URL = process.env.AUDIT_LOCAL_URL || 'http://localhost:5173';
const UPSTREAM_URL = process.env.AUDIT_UPSTREAM_URL || 'http://127.0.0.1:3001';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: LOCAL_URL,
    headless: process.env.HEADLESS !== 'false',
    channel: process.env.AUDIT_CHANNEL as 'chrome' | undefined,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'on',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    testIdAttribute: 'data-testid',
  },

  projects: [
    {
      name: 'local-desktop',
      use: { baseURL: LOCAL_URL, ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'local-mobile',
      use: { baseURL: LOCAL_URL, ...devices['Pixel 7'] },
    },
    {
      name: 'upstream-desktop',
      use: { baseURL: UPSTREAM_URL, ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
