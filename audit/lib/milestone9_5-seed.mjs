// Seeds M9.5 parity fixtures as chats. Pure OpenUI fixtures are wrapped in an
// :::intelligent-ui fence; "raw" fixtures already contain their fence + prose.
// Writes ids to /tmp/m95ids.json.
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.PAW_BASE || 'http://127.0.0.1:8080';
const EMAIL = process.env.PAW_TEST_EMAIL || 'admin@paw.local';
const PASSWORD = process.env.PAW_TEST_PASSWORD || 'PawLocalAdmin123!';
const FIX = path.resolve(process.cwd(), '..', 'tests/fixtures/intelligent-ui');

const PURE = {
	pricing: 'm95-pricing.txt',
	vps: 'm95-vps.txt',
	analytics: 'm95-analytics.txt',
	timeline: 'm95-timeline.txt',
	gallery: 'm95-gallery.txt',
	form: 'm95-form.txt',
	querySuccess: 'm95-query-success.txt',
	queryEmpty: 'm95-query-empty.txt',
	queryError: 'm95-query-error.txt'
};
const RAW = {
	mixed: 'm95-mixed.txt',
	rich: 'm95-rich.txt',
	streamPartial: 'm95-stream-partial.txt',
	streamComplete: 'm95-stream-complete.txt'
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
	return (await r.json()).token;
}

const token = await getToken();
fs.writeFileSync('/tmp/token', token);

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
		await fetch(`${BASE}/api/v1/files/?process=false`, {
			method: 'POST',
			headers: { authorization: `Bearer ${token}` },
			body: fd
		});
	}
}
await ensureFiles();

async function createChat(name, content, done = true) {
	const ts = Math.floor(Date.now() / 1000);
	const chat = {
		title: `IU m9.5 ${name}`,
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
					done,
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

const ids = {};
for (const [name, file] of Object.entries(PURE)) {
	const body = fs.readFileSync(path.join(FIX, file), 'utf8').trim();
	await createChat(name, `:::intelligent-ui{v="1"}\n${body}\n:::`);
}
for (const [name, file] of Object.entries(RAW)) {
	const body = fs.readFileSync(path.join(FIX, file), 'utf8').trim();
	// streamPartial stays unterminated (renders in partial/streaming mode).
	await createChat(name, body, name !== 'streamPartial');
}

fs.writeFileSync('/tmp/m95ids.json', JSON.stringify(ids, null, 2));
console.log('wrote /tmp/m95ids.json');
