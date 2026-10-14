import path from 'node:path';
import { launchAuditContext, stopAndSave, screenshotFull, writeIssues } from './browser.mjs';
import { DIRS, PROFILE_DIR, TARGETS, VIEWPORTS, stamp } from './paths.mjs';

/**
 * Capture a full-page screenshot + diagnostics for one audit target.
 *
 * Usage:
 *   node lib/capture.mjs --target local [--path /] [--viewport desktop-1440] [--headed]
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) args[a.slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i];
  }
  return args;
}

(async () => {
  const args = parseArgs(process.argv);
  const target = args.target || 'local';
  if (!DIRS[target]) throw new Error(`Unknown target '${target}'. Use: local | chatgpt | upstream`);

  const url = args.url || TARGETS[target];
  const viewportName = args.viewport || 'desktop-1440';
  const viewport = VIEWPORTS[viewportName];
  const tag = `${target}-${viewportName}-${stamp()}`;

  const { context, issues, tracePath } = await launchAuditContext({
    headless: !args.headed,
    userDataDir: target === 'chatgpt' ? PROFILE_DIR : undefined,
    viewport,
    isMobile: !!viewport.isMobile,
    hasTouch: !!viewport.hasTouch,
    recordVideo: args.video === true || args.video === 'true',
    tag,
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => page.goto(url, { waitUntil: 'domcontentloaded' }));

  // Let client-side rendering settle.
  await page.waitForTimeout(1500);

  const shot = path.join(DIRS[target], `${tag}.png`);
  await screenshotFull(page, shot);
  writeIssues(issues, path.join(DIRS[target], `${tag}-issues.json`));

  console.log(`Screenshot: ${path.relative(process.cwd(), shot)}`);
  console.log(`Trace     : ${path.relative(process.cwd(), tracePath)}`);
  console.log(`Console errors: ${issues.consoleErrors.length}, page errors: ${issues.pageErrors.length}, failed requests: ${issues.failedRequests.length}`);

  await stopAndSave(context, tracePath);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
