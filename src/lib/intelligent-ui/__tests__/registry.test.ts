import { describe, it, expect } from 'vitest';
import { SUPPORTED_COMPONENTS, getComponent, isSupportedComponent } from '../registry';

describe('intelligent-ui registry — strict allow-list', () => {
	it('supports exactly metric, comparison, table', () => {
		expect([...SUPPORTED_COMPONENTS].sort()).toEqual(['comparison', 'metric', 'table']);
	});

	it('resolves supported components', () => {
		expect(getComponent('metric')).toBeTruthy();
		expect(getComponent('comparison')).toBeTruthy();
		expect(getComponent('table')).toBeTruthy();
	});

	it('rejects unknown components', () => {
		expect(getComponent('chart')).toBeNull();
		expect(getComponent('form')).toBeNull();
		expect(getComponent('html')).toBeNull();
		expect(isSupportedComponent('map')).toBe(false);
	});
});
