// Seeds one chat per M9.4 fixture (assistant message with an :::intelligent-ui
// block) so the Playwright capture can render each native component. Writes ids
// to /tmp/m94ids.json.
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.PAW_BASE || 'http://127.0.0.1:8080';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const FIX = path.resolve(process.cwd(), '..', 'tests/fixtures/intelligent-ui');

const MAP = {
	dashboard: 'm94-dashboard.txt',
	pricing: 'm94-pricing.txt',
	analytics: 'm94-analytics.txt',
	form: 'm94-form.txt',
	gallery: 'm94-gallery.txt',
	nested: 'm94-nested.txt',
	invalid: 'm94-invalid-limit.txt'
};

async function getToken() {
	try {
		const t = fs.readFileSync('/tmp/token', 'utf8').trim();
		if (t) {
			const r = await fetch(`${BASE}/api/v1/auths/`, { headers: { authorization: `Bearer ${t}` } });
			if (r.ok) return t;
		}
	} catch {}
	const r = await fetch(`${BASE}/api/v1/auths/signin`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: EMAIL, password: PASSWORD })
	});
	if (!r.ok) throw new Error(`signin failed ${r.status}`);
	const d = await r.json();
	return d.token;
}

const token = await getToken();
fs.writeFileSync('/tmp/token', token);

// Ensure the library has a few files so the query-backed chart (library.files)
// has numeric data to plot. Upload only when the library is empty.
async function ensureFiles() {
	const r = await fetch(`${BASE}/api/v1/files/`, { headers: { authorization: `Bearer ${token}` } });
	const existing = r.ok ? await r.json() : [];
	if (Array.isArray(existing) && existing.length > 0) return;
	const files = [
		['Report.txt', 'Quarterly report. '.repeat(40)],
		['Notes.txt', 'Meeting notes. '.repeat(15)],
		['Data.csv', 'a,b\n1,2\n'.repeat(30)]
	];
	for (const [name, content] of files) {
		const fd = new FormData();
		fd.append('file', new Blob([content], { type: 'text/plain' }), name);
		const up = await fetch(`${BASE}/api/v1/files/?process=false`, {
			method: 'POST',
			headers: { authorization: `Bearer ${token}` },
			body: fd
		});
		console.log(`file ${name}: ${up.status}`);
	}
}
await ensureFiles();

const ids = {};
for (const [name, file] of Object.entries(MAP)) {
	const body = fs.readFileSync(path.join(FIX, file), 'utf8').trim();
	const content = `:::intelligent-ui{v="1"}\n${body}\n:::`;
	const ts = Math.floor(Date.now() / 1000);
	const chat = {
		title: `IU m9.4 ${name}`,
		models: ['deepseek-v4.1-flash'],
		params: {},
		history: {
			currentId: 'm1',
			messages: {
				m1: {
					id: 'm1',
					parentId: null,
					childrenIds: [],
					role: 'assistant',
					content,
					timestamp: ts,
					done: true,
					model: 'deepseek-v4.1-flash'
				}
			}
		},
		messages: [{ role: 'assistant', content }],
		share_mode: 'continue'
	};
	const r = await fetch(`${BASE}/api/v1/chats/new`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify({ chat })
	});
	if (!r.ok) throw new Error(`create ${name} failed ${r.status}`);
	const d = await r.json();
	ids[name] = d.id;
	console.log(`${name}: ${d.id}`);
}

fs.writeFileSync('/tmp/m94ids.json', JSON.stringify(ids, null, 2));
console.log('wrote /tmp/m94ids.json');
