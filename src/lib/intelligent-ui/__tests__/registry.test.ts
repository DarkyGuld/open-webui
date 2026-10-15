import { describe, it, expect } from 'vitest';
import { SUPPORTED_COMPONENTS, getLeafComponent, isSupportedComponent } from '../registry';

describe('intelligent-ui registry — strict allow-list', () => {
	it('supports the full allow-list (leaves + containers)', () => {
		expect([...SUPPORTED_COMPONENTS].sort()).toEqual([
			'badge',
			'button',
			'card',
			'checkbox',
			'comparison',
			'divider',
			'grid',
			'input',
			'metric',
			'row',
			'section',
			'select',
			'slider',
			'stack',
			'switch',
			'table'
		]);
	});

	it('resolves leaf components', () => {
		expect(getLeafComponent('metric')).toBeTruthy();
		expect(getLeafComponent('comparison')).toBeTruthy();
		expect(getLeafComponent('table')).toBeTruthy();
		expect(getLeafComponent('badge')).toBeTruthy();
		expect(getLeafComponent('divider')).toBeTruthy();
	});

	it('rejects unknown components', () => {
		expect(getLeafComponent('chart')).toBeNull();
		expect(getLeafComponent('form')).toBeNull();
		expect(isSupportedComponent('html')).toBe(false);
		expect(isSupportedComponent('map')).toBe(false);
	});
});
