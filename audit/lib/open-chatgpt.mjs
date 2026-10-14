import readline from 'node:readline';
import { launchAuditContext, stopAndSave, writeIssues } from './browser.mjs';
import { PROFILE_DIR, TARGETS, DIRS } from './paths.mjs';
import path from 'node:path';

/**
 * Opens ChatGPT in a HEADED Chrome/Chromium with a persistent profile so the
 * user can log in manually. The authenticated session is preserved in
 * .local/browser-profiles/chatgpt and reused by later audit runs.
 *
 * It never reads, prints, or stores credentials, MFA codes, or cookies.
 */
(async () => {
  const { context, issues, tracePath } = await launchAuditContext({
    headless: false,
    userDataDir: PROFILE_DIR,
    viewport: { width: 1440, height: 900 },
    tag: 'chatgpt-login',
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto(TARGETS.chatgpt, { waitUntil: 'domcontentloaded' });

  console.log('');
  console.log('=== ChatGPT interactive login ===');
  console.log(`Profile dir : ${PROFILE_DIR}`);
  console.log('');
  console.log('1. Log into ChatGPT in the opened browser window (including any MFA).');
  console.log('2. The session is saved automatically to the persistent profile.');
  console.log('3. When finished, return here and press ENTER to close the browser.');
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => rl.question('Press ENTER to close the browser... ', resolve));
  rl.close();

  writeIssues(issues, path.join(DIRS.chatgpt, 'login-console-issues.json'));
  await stopAndSave(context, tracePath);
  console.log('Session preserved. Trace:', tracePath);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
