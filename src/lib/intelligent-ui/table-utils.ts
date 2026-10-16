/**
 * Small presentation helpers for native tables (no dependencies).
 */

/** True when every non-empty cell in the column parses as a number/percent/currency-ish value. */
export function isNumericColumn(rows: (string | number)[][], ci: number): boolean {
	let sawValue = false;
	for (const row of rows) {
		const v = row[ci];
		if (v == null || v === '') continue;
		if (typeof v === 'number') {
			sawValue = true;
			continue;
		}
		const s = String(v).trim();
		// digits with optional sign, thousands separators, decimals, %, currency suffix
		if (/^[-+]?[\d\s.,]+%?$/.test(s) || /^[-+]?[\d\s.,]+\s*[^\d\s]{0,3}$/.test(s)) {
			if (/\d/.test(s)) {
				sawValue = true;
				continue;
			}
		}
		return false;
	}
	return sawValue;
}

export function columnAlign(
	rows: (string | number)[][],
	ci: number
): 'right' | 'left' {
	return isNumericColumn(rows, ci) ? 'right' : 'left';
}
