import { describe, expect, it } from 'vitest';
import { safeNavigationUrl } from '../navigation';

describe('safe navigation for model-produced links', () => {
	it('allows valid absolute HTTP(S)', () => {
		expect(safeNavigationUrl('https://example.com/a')).toBe('https://example.com/a');
		expect(safeNavigationUrl('http://localhost:3000/')).toBe('http://localhost:3000/');
	});
	it('blocks scripts, credentials, relative URLs, whitespace and control characters', () => {
		for (const value of ['javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/a',
			'//example.com', '/path', 'https://u:p@example.com', ' https://example.com',
			'https://example.com/\\nnext', 'https://example.com\\\\@evil.com']) {
			expect(safeNavigationUrl(value)).toBeNull();
		}
	});
});
