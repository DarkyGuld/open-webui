// Real application end-to-end verification. Synthetic accounts/files only;
// no model calls, no production user data captured. Fault injection is explicit.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const API = 'http://127.0.0.1:8080/api/v1';
const BASE = 'http://127.0.0.1:5173';
const admin = process.env.PAW_TEST_TOKEN || fs.readFileSync('/tmp/token', 'utf8').trim();
const OUT = path.resolve('local/library-first-slice');
fs.mkdirSync(OUT, { recursive: true });
const users = [];
const files = [];
const checks = [];
const errors = [];
const requests = [];
const browser = await chromium.launch();
let faultPhase = false;
let expectedFaultErrors = 0;
let activeFileRequests = 0;
const check = (name, value) => { assert(value, name); checks.push(name); };

async function account(label) {
	const res = await fetch(`${API}/auths/add`, { method: 'POST',
		headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' },
		body: JSON.stringify({ name: `Synthetic Library ${label}`, email: `${randomUUID()}@example.com`, password: randomUUID() + 'aA9!', role: 'user' }) });
	assert(res.ok, `Could not create synthetic account: ${res.status}`);
	const user = await res.json();
	assert(user.id && user.token, 'Synthetic account did not receive a token');
	users.push(user);
	return user;
}
async function upload(user, name, mime, bytes) {
	const form = new FormData();
	form.append('file', new Blob([bytes], { type: mime }), name);
	const res = await fetch(`${API}/files/?process=false`, { method: 'POST', headers: { authorization: `Bearer ${user.token}` }, body: form });
	assert(res.ok, `Fixture upload failed: ${res.status}`);
	const file = await res.json();
	files.push({ id: file.id, token: user.token });
	return file;
}
async function get(token, endpoint) { return fetch(`${API}${endpoint}`, { headers: token ? { authorization: `Bearer ${token}` } : {} }); }
function pdf() {
	const stream = 'BT /F1 18 Tf 30 100 Td (Synthetic Library PDF) Tj ET';
	const objects = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
		`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
	];
	let result = '%PDF-1.4\n';
	const offsets = [0];
	for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(result)); result += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
	const xref = Buffer.byteLength(result);
	result += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('');
	return result + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
}
const videoPath = path.join(OUT, `fixture-${randomUUID()}.webm`);

try {
	const a = await account('A');
	const b = await account('B');
	const foreign = await upload(b, 'Foreign private fixture.txt', 'text/plain', 'Never visible to account A');
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	await context.addInitScript(({ token }) => {
		if (window !== window.top) return;
		localStorage.setItem('token', token);
		if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');
		if (!localStorage.getItem('locale')) localStorage.setItem('locale', 'en-US');
	}, { token: a.token });
	const page = await context.newPage();
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => {
		if (m.type() !== 'error' || m.text().includes('socket.io')) return;
		if (faultPhase && /Failed to load resource.*(?:404|503)/.test(m.text())) expectedFaultErrors++;
		else errors.push(m.text());
	});
	page.on('request', (r) => {
		if (r.url().includes('/api/v1/files/')) {
			requests.push({ method: r.method(), pathname: new URL(r.url()).pathname });
			if (r.url().includes('/content')) activeFileRequests++;
		}
		if (r.url().includes('untrusted.invalid')) errors.push('Uploaded active content made an external request');
	});

	await page.goto(`${BASE}/library`);
	await page.getByText('No files yet', { exact: true }).waitFor({ timeout: 30000 });
	check('real empty owner file list', await page.getByText('No files yet', { exact: true }).isVisible());
	check('Library is discoverable in native navigation', await page.getByRole('link', { name: 'Library', exact: true }).count() >= 1);
	await page.screenshot({ path: path.join(OUT, '01-empty-dark.png'), fullPage: true });
	check('unauthenticated listing rejected', (await get('', '/files/?content=false')).status === 401);
	check('unauthenticated content rejected', (await get('', `/files/${foreign.id}/content`)).status === 401);
	check('second user cannot fetch private file metadata', (await get(a.token, `/files/${foreign.id}`)).status === 404);
	check('second user cannot fetch private original bytes', (await get(a.token, `/files/${foreign.id}/content`)).status === 404);
	check('list does not leak another user file', !(await (await get(a.token, '/files/?content=false')).text()).includes(foreign.id));

	const png = Buffer.from(await page.evaluate(() => {
		const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#334155'; ctx.fillRect(0, 0, 640, 360);
		ctx.fillStyle = '#e2e8f0'; ctx.font = '24px sans-serif'; ctx.fillText('Synthetic Library image', 42, 180);
		return canvas.toDataURL('image/png').split(',')[1];
	}), 'base64');
	await upload(a, 'Library fixture image.png', 'image/png', png);
	const textFile = await upload(a, 'Library fixture memo.txt', 'text/plain', 'Synthetic memo\n<script>window.__libraryExecuted=true</script>\n<img src="https://untrusted.invalid/tracker">');
	await upload(a, 'Library fixture document.pdf', 'application/pdf', pdf());
	execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:d=1', '-c:v', 'libvpx-vp9', '-an', '-y', videoPath]);
	await upload(a, 'Library fixture clip.webm', 'video/webm', fs.readFileSync(videoPath));
	const wav = Buffer.alloc(44 + 16000);
	wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
	wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
	wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
	wav.write('data', 36); wav.writeUInt32LE(16000, 40);
	await upload(a, 'Library fixture audio.wav', 'audio/wav', wav);
	for (let i = 0; i < 47; i++) await upload(a, `Library fixture filler ${String(i).padStart(2, '0')}.txt`, 'text/plain', 'Synthetic pagination fixture');
	const search = page.getByRole('searchbox', { name: 'Search filenames' });
	const type = page.getByRole('combobox', { name: 'File type', exact: true });
	const rows = page.getByRole('list', { name: 'Uploaded files' });
	await page.getByRole('button', { name: 'Refresh', exact: true }).click();
	await rows.getByRole('listitem').first().waitFor();
	check('initial page bounded to 50 metadata rows', await rows.getByRole('listitem').count() === 50);
	check('no eager preview-byte loading', activeFileRequests === 0);
	await page.getByRole('button', { name: 'Load more', exact: true }).click();
	await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Uploaded files"] li').length === 52);
	check('real server pagination loads remaining files', await rows.getByRole('listitem').count() === 52);
	await type.selectOption('image');
	check('image filter over loaded rows', await rows.getByRole('listitem').count() === 1);
	await page.getByRole('button', { name: 'Preview Library fixture image.png', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'File preview' });
	await dialog.getByRole('img', { name: 'Library fixture image.png' }).waitFor();
	await page.waitForFunction(() => document.querySelector('[role="dialog"] img')?.naturalWidth > 0);
	check('real authenticated raster image preview', await dialog.getByRole('img').isVisible());
	await page.screenshot({ path: path.join(OUT, '02-image-preview.png'), fullPage: true });
	await page.keyboard.press('Escape');
	await dialog.waitFor({ state: 'detached' });
	check('native Modal Escape closes preview', await page.getByRole('dialog').count() === 0);
	await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Preview Library fixture image.png');
	check('closing preview restores keyboard focus to file row', await page.getByRole('button', { name: 'Preview Library fixture image.png', exact: true }).evaluate((el) => el === document.activeElement));
	await type.selectOption('all');
	await search.fill('Library fixture memo');
	await page.getByRole('button', { name: 'Preview Library fixture memo.txt', exact: true }).waitFor();
	await page.getByRole('button', { name: 'Preview Library fixture memo.txt', exact: true }).click();
	await dialog.locator('pre').waitFor();
	check('text preview escaped instead of executing upload HTML', (await dialog.locator('pre').textContent()).includes('<script>'));
	check('uploaded script never executed', await page.evaluate(() => window.__libraryExecuted === undefined));
	await page.getByRole('button', { name: 'Close', exact: true }).click();
	await search.fill('Library fixture clip');
	await page.getByRole('button', { name: 'Preview Library fixture clip.webm', exact: true }).waitFor();
	await page.getByRole('button', { name: 'Preview Library fixture clip.webm', exact: true }).click();
	await dialog.locator('video').waitFor();
	await dialog.locator('video').evaluate((v) => v.play());
	await page.waitForFunction(() => document.querySelector('[role="dialog"] video')?.currentTime > 0);
	check('real video fixture actually plays', await dialog.locator('video').evaluate((v) => v.currentTime > 0));
	await page.getByRole('button', { name: 'Close', exact: true }).click();
	await search.fill('Library fixture audio');
	await page.getByRole('button', { name: 'Preview Library fixture audio.wav', exact: true }).waitFor();
	await page.getByRole('button', { name: 'Preview Library fixture audio.wav', exact: true }).click();
	await dialog.locator('audio').waitFor();
	await dialog.locator('audio').evaluate((a) => a.play());
	check('real audio is decodable', await dialog.locator('audio').evaluate((a) => a.readyState >= 1));
	await page.getByRole('button', { name: 'Close', exact: true }).click();
	await search.fill('Library fixture document');
	await page.getByRole('button', { name: 'Preview Library fixture document.pdf', exact: true }).waitFor();
	await page.getByRole('button', { name: 'Preview Library fixture document.pdf', exact: true }).click();
	await dialog.locator('canvas').first().waitFor({ timeout: 30000 });
	check('native PDFViewer renders an actual PDF page', await dialog.locator('canvas').count() >= 1);
	await page.screenshot({ path: path.join(OUT, '03-pdf-preview.png'), fullPage: true });
	await page.getByRole('button', { name: 'Close', exact: true }).click();

	// Explicit fault injection (the normal flows above used real authenticated APIs).
	faultPhase = true;
	await page.route('**/api/v1/files/search?**', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
	await search.fill('Library fixture memo');
	await page.getByText('Could not load files. Please try again.', { exact: true }).waitFor();
	check('server failure is not disguised as empty files', await page.getByRole('alert').isVisible());
	await page.screenshot({ path: path.join(OUT, '07-recoverable-list-error.png'), fullPage: true });
	await page.unroute('**/api/v1/files/search?**');
	await page.getByRole('button', { name: 'Retry', exact: true }).click();
	await page.getByRole('button', { name: 'Preview Library fixture memo.txt', exact: true }).waitFor();
	check('Retry recovers with the real API', await page.getByRole('alert').count() === 0);
	// File removed after listing: original content GET is rejected and safe UI shown.
	await fetch(`${API}/files/${textFile.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${a.token}` } });
	await page.getByRole('button', { name: 'Preview Library fixture memo.txt', exact: true }).click();
	await page.getByText('This file could not be previewed. It may have been removed or access may have changed.', { exact: true }).waitFor();
	check('deleted original bytes show recoverable preview error', await dialog.getByRole('alert').isVisible());
	await page.getByRole('button', { name: 'Close', exact: true }).click();
	await search.fill('no-such-library-synthetic-fixture');
	await page.getByText('No matching files in loaded results', { exact: true }).waitFor();
	check('real empty filename search is not an error', await page.getByRole('alert').count() === 0);
	faultPhase = false;
	await search.fill('Library fixture');
	await rows.getByRole('listitem').first().waitFor();
	await page.getByRole('combobox', { name: 'Sort loaded files' }).selectOption('name');
	check('Library exposes no mutation controls', await page.getByRole('button', { name: /^(delete|rename|upload)$/i }).count() === 0);
	check('all browser File API traffic is read-only', requests.every((r) => r.method === 'GET'));
	check('desktop dark theme active', await page.evaluate(() => document.documentElement.classList.contains('dark')));
	await page.screenshot({ path: path.join(OUT, '04-library-dark.png'), fullPage: true });
	await page.evaluate(() => localStorage.setItem('theme', 'light'));
	await page.reload();
	await rows.getByRole('listitem').first().waitFor({ timeout: 30000 });
	check('light theme active', await page.evaluate(() => !document.documentElement.classList.contains('dark')));
	await page.screenshot({ path: path.join(OUT, '05-library-light.png'), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => { localStorage.setItem('theme', 'dark'); localStorage.setItem('locale', 'nb-NO'); });
	await page.reload();
	await page.getByRole('heading', { name: 'Bibliotek', exact: true }).waitFor({ timeout: 30000 });
	await page.getByRole('list', { name: 'Opplastede filer' }).getByRole('listitem').first().waitFor();
	check('Norwegian labels loaded', await page.getByRole('searchbox', { name: 'Søk etter filnavn' }).isVisible());
	check('mobile does not overflow horizontally', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
	await page.screenshot({ path: path.join(OUT, '06-library-mobile-norwegian.png'), fullPage: true });
	// Expanded native navigation: the Library entry must match the surrounding nav items.
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.evaluate(() => {
		localStorage.setItem('theme', 'dark');
		localStorage.setItem('locale', 'en-US');
		localStorage.setItem('sidebar', 'true');
	});
	await page.reload();
	await rows.getByRole('listitem').first().waitFor({ timeout: 30000 });
	await page.locator('#sidebar-library-button').waitFor({ timeout: 30000 });
	check(
		'expanded native navigation shows the Library entry',
		await page.locator('#sidebar-library-button').isVisible()
	);
	await page.screenshot({ path: path.join(OUT, '08-library-expanded-sidebar.png'), fullPage: true });
	check('no unexpected browser errors', errors.length === 0);
	console.log(JSON.stringify({ status: 'PASS', checks, expectedFaultErrors, unexpectedErrors: errors, modelCalls: 0 }, null, 2));
} catch (error) {
	console.log(JSON.stringify({ status: 'FAIL', completedChecks: checks, unexpectedErrors: errors, message: error.message }, null, 2));
	throw error;
} finally {
	await browser.close();
	for (const file of files) {
		const removed = await fetch(`${API}/files/${file.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${file.token}` } });
		if (!removed.ok && removed.status !== 404) {
			// Some local slim setups delete bytes/metadata before optional vector
			// cleanup reports an error. Verify the synthetic record is actually gone.
			assert((await get(file.token, `/files/${file.id}`)).status === 404, 'Synthetic file cleanup failed');
		}
	}
	for (const user of users) {
		const removed = await fetch(`${API}/users/${user.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${admin}` } });
		assert(removed.ok || removed.status === 404, 'Synthetic user cleanup failed');
	}
	if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
}
