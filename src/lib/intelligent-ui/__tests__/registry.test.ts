import { describe, it, expect } from 'vitest';
import { SUPPORTED_COMPONENTS, getLeafComponent, isSupportedComponent } from '../registry';

describe('intelligent-ui registry — strict allow-list', () => {
	it('supports the full allow-list (leaves + containers)', () => {
		expect([...SUPPORTED_COMPONENTS].sort()).toEqual([
			'badge',
			'button',
			'card',
			'chart',
			'checkbox',
			'comparison',
			'data',
			'divider',
			'field',
			'form',
			'gallery',
			'grid',
			'input',
			'metric',
			'progress',
			'radio',
			'row',
			'section',
			'select',
			'slider',
			'stack',
			'switch',
			'tab',
			'table',
			'tabs',
			'textarea',
			'timeline'
		]);
	});

	it('resolves leaf components', () => {
		expect(getLeafComponent('metric')).toBeTruthy();
		expect(getLeafComponent('comparison')).toBeTruthy();
		expect(getLeafComponent('table')).toBeTruthy();
		expect(getLeafComponent('badge')).toBeTruthy();
		expect(getLeafComponent('divider')).toBeTruthy();
		expect(getLeafComponent('chart')).toBeTruthy();
		expect(getLeafComponent('progress')).toBeTruthy();
		expect(getLeafComponent('timeline')).toBeTruthy();
		expect(getLeafComponent('gallery')).toBeTruthy();
	});

	it('rejects unknown components', () => {
		expect(getLeafComponent('html')).toBeNull();
		expect(getLeafComponent('map')).toBeNull();
		expect(isSupportedComponent('html')).toBe(false);
		expect(isSupportedComponent('map')).toBe(false);
		expect(isSupportedComponent('script')).toBe(false);
	});
});
