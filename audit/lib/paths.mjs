import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AUDIT_DIR = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(AUDIT_DIR, '..');

export const DIRS = {
  chatgpt: path.join(AUDIT_DIR, 'chatgpt'),
  local: path.join(AUDIT_DIR, 'local'),
  upstream: path.join(AUDIT_DIR, 'upstream-openwebui'),
  recordings: path.join(AUDIT_DIR, 'recordings'),
  traces: path.join(AUDIT_DIR, 'traces'),
  screenshots: path.join(AUDIT_DIR, 'screenshots'),
  diffs: path.join(AUDIT_DIR, 'diffs'),
};

export const PROFILE_DIR = path.join(REPO_ROOT, '.local', 'browser-profiles', 'chatgpt');

export const TARGETS = {
  local: process.env.AUDIT_LOCAL_URL || 'http://localhost:5173',
  upstream: process.env.AUDIT_UPSTREAM_URL || 'http://127.0.0.1:3001',
  chatgpt: process.env.AUDIT_CHATGPT_URL || 'https://chatgpt.com',
};

export const VIEWPORTS = {
  'desktop-1440': { width: 1440, height: 900 },
  'desktop-1920': { width: 1920, height: 1080 },
  'tablet-834': { width: 834, height: 1112 },
  'mobile-390': { width: 390, height: 844, isMobile: true, hasTouch: true },
};

export function ensureDirs() {
  for (const dir of Object.values(DIRS)) fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
