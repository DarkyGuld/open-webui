import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { columnAlign, isNumericColumn } from '../table-utils';
import { parseIntelligentUI } from '../adapter';

const fixture = (name: string): string =>
	readFileSync(
		fileURLToPath(new URL(`../../../../tests/fixtures/intelligent-ui/${name}`, import.meta.url)),
		'utf8'
	);
const translation = (() => {
	const raw = readFileSync(
		fileURLToPath(new URL('../../i18n/locales/en-US/translation.json', import.meta.url)),
		'utf8'
	);
	return JSON.parse(raw) as Record<string, string>;
})();

describe('M9.5 — visual/interaction polish', () => {
	describe('table numeric alignment', () => {
		it('right-aligns numeric and unit-bearing columns', () => {
			const rows = [
				['Basic', '1', '1 GB', '99 kr'],
				['Pro', '2', '4 GB', '199 kr']
			];
			expect(columnAlign(rows, 0)).toBe('left');
			expect(columnAlign(rows, 1)).toBe('right');
			expect(columnAlign(rows, 2)).toBe('right');
			expect(columnAlign(rows, 3)).toBe('right');
		});

		it('leaves text columns left-aligned', () => {
			expect(isNumericColumn([['Pro'], ['Team']], 0)).toBe(false);
		});

		it('ignores empty cells and empty columns', () => {
			expect(columnAlign([[''], ['']], 0)).toBe('left');
			expect(columnAlign([['', '5'], ['', '6']], 1)).toBe('right');
		});
	});

	describe('mixed Markdown + UI response', () => {
		it('extracts and parses the UI block from a mixed message', () => {
			const content = fixture('m95-mixed.txt');
			const m = content.match(/:::intelligent-ui\{[^}]*\}\s*\n([\s\S]*?)\n:::/);
			expect(m).toBeTruthy();
			const out = parseIntelligentUI({ version: '1', content: (m as RegExpMatchArray)[1] });
			expect(out.ok).toBe(true);
		});

		it('keeps prose around the block (not replaced)', () => {
			const content = fixture('m95-mixed.txt');
			expect(content).toContain('The **Pro** plan is the best balance');
		});
	});

	describe('streaming partial fixture', () => {
		it('an unterminated fence yields a partial (unclosed) program', () => {
			const content = fixture('m95-stream-partial.txt').trim();
			expect(content.startsWith(':::intelligent-ui')).toBe(true);
			expect(content.trimEnd().endsWith(':::')).toBe(false);
		});
	});

	describe('fallback wording (no implementation details leaked)', () => {
		it('uses the restrained interactive-view message', () => {
			expect(translation['Interactive view unavailable']).toBeTruthy();
		});
		it('provides the standardized query error/retry strings', () => {
			expect(translation['Couldn’t load this data']).toBeTruthy();
			expect(translation['Retry']).toBeTruthy();
		});
	});

	describe('parity fixtures parse', () => {
		for (const name of [
			'm95-pricing.txt',
			'm95-vps.txt',
			'm95-analytics.txt',
			'm95-timeline.txt',
			'm95-gallery.txt',
			'm95-form.txt',
			'm95-query-success.txt',
			'm95-query-empty.txt',
			'm95-query-error.txt'
		]) {
			it(`parses ${name}`, () => {
				const out = parseIntelligentUI({ version: '1', content: fixture(name) });
				expect(out.ok).toBe(true);
			});
		}
	});
});
