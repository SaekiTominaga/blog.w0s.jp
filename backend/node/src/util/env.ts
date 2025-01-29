export function env(key: string, type?: 'string'): string;
export function env(key: string, type: 'string[]'): string[];
export function env(key: string, type: 'number'): number;
export function env(key: string, type: 'number[]'): number[];
export function env(key: string, type: 'boolean'): boolean;

/**
 * `process.env` の値を取得する
 *
 * @param key - キー
 * @param type - 値の種類
 *
 * @returns 値
 */
export function env(key: string, type?: 'string' | 'string[]' | 'number' | 'number[]' | 'boolean') {
	const value = process.env[key];
	if (value === undefined) {
		throw new Error(`process.env["${key}"] not defined`);
	}

	const SEPARATOR = ' ';

	switch (type) {
		case 'string': {
			return value;
		}
		case 'string[]': {
			return value.split(SEPARATOR);
		}
		case 'number': {
			return Number(value);
		}
		case 'number[]': {
			return value.split(SEPARATOR).map((split) => Number(split));
		}
		case 'boolean': {
			return value === 'true';
		}
		default:
	}

	return value;
}
