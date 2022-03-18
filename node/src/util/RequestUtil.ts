import dayjs, { Dayjs } from 'dayjs';

/**
 * Request Utility
 */
export default class RequestUtil {
	/**
	 * Convert to string type
	 *
	 * @param {any} request - Request string
	 *
	 * @returns {string} Converted
	 */
	static string(request: unknown): string | null {
		return typeof request === 'string' ? String(request) : null;
	}

	/**
	 * Convert to string[] type
	 *
	 * @param {any} request - Request string
	 *
	 * @returns {string[]} Converted
	 */
	static strings(request: unknown): string[] {
		return Array.isArray(request) ? request : [];
	}

	/**
	 * Convert to number type
	 *
	 * @param {any} request - Request string
	 *
	 * @returns {number} Converted
	 */
	static number(request: unknown): number | null {
		return typeof request === 'string' ? Number(request) : null;
	}

	/**
	 * Convert to boolean type
	 *
	 * @param {any} request - Request string
	 *
	 * @returns {boolean} Converted
	 */
	static boolean(request: unknown): boolean {
		return Boolean(request);
	}

	/**
	 * Convert to Dayjs type (YYYY-MM)
	 *
	 * @param {any} request - Request string
	 *
	 * @returns {Dayjs} Converted
	 */
	static dateYYYYMM(request: unknown): Dayjs | null {
		return typeof request === 'string' ? dayjs(new Date(Number(request.substring(0, 4)), Number(request.substring(5, 7)) - 1)) : null;
	}
}
