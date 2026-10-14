import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { DIRS, REPO_ROOT, ensureDirs, stamp } from './paths.mjs';

const DEFAULT_PROFILE = path.join(REPO_ROOT, '.local', 'browser-profiles', 'ephemeral');

/**
 * Launch a Chromium/Chrome context for UI auditing.
 *
 * @param {object} opts
 * @param {boolean} [opts.headless]   default false (headed) for interactive auditing
 * @param {string}  [opts.channel]    'chrome' to use system Google Chrome, else bundled Chromium
 * @param {string}  [opts.userDataDir] persistent profile directory (enables reused login)
 * @param {object}  [opts.viewport]
 * @param {boolean} [opts.recordVideo]
 * @param {string}  [opts.tag]        used for recording/trace/screenshot filenames
 */
export async function launchAuditContext(opts = {}) {
  ensureDirs();
  const {
    headless = false,
    channel = process.env.AUDIT_CHANNEL || undefined,
    userDataDir,
    viewport = { width: 1440, height: 900 },
    recordVideo = false,
    isMobile = false,
    hasTouch = false,
    tag = 'session',
  } = opts;

  const stampStr = stamp();
  const context = await chromium.launchPersistentContext(userDataDir || DEFAULT_PROFILE, {
    headless,
    channel,
    viewport,
    isMobile,
    hasTouch,
    acceptDownloads: true,
    recordVideo: recordVideo
      ? { dir: path.join(DIRS.recordings, tag), size: { width: viewport.width, height: viewport.height } }
      : undefined,
  });

  // Always record a trace for later inspection (screenshots + DOM snapshots + network).
  const tracePath = path.join(DIRS.traces, `${tag}-${stampStr}.zip`);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  const issues = { consoleErrors: [], pageErrors: [], failedRequests: [], badResponses: [] };

  context.on('page', (page) => attachDiagnostics(page, issues));

  return { context, issues, stampStr, tracePath };
}

function attachDiagnostics(page, issues) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') issues.consoleErrors.push({ url: page.url(), text: msg.text() });
  });
  page.on('pageerror', (err) => issues.pageErrors.push({ url: page.url(), text: String(err) }));
  page.on('requestfailed', (req) =>
    issues.failedRequests.push({ url: req.url(), failure: req.failure()?.errorText })
  );
  page.on('response', (res) => {
    if (res.status() >= 400) issues.badResponses.push({ url: res.url(), status: res.status() });
  });
}

export async function stopAndSave(context, tracePath) {
  try {
    await context.tracing.stop({ path: tracePath });
  } catch {
    /* ignore */
  }
  await context.close();
}

export async function screenshotFull(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: true });
}

export async function screenshotElement(page, selector, filePath) {
  const el = await page.$(selector);
  if (!el) throw new Error(`Selector not found: ${selector}`);
  await el.screenshot({ path: filePath });
}

export function writeIssues(issues, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(issues, null, 2));
}
