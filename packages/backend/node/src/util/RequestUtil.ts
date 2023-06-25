import dayjs, { Dayjs } from 'dayjs';

/**
 * Request Utility
 */
export default class RequestUtil {
	/**
	 * Convert to string type
	 *
	 * @param request - Request string
	 *
	 * @returns Converted
	 */
	static string(request: unknown): string | null {
		return typeof request === 'string' ? String(request) : null;
	}

	/**
	 * Convert to string[] type
	 *
	 * @param request - Request string
	 *
	 * @returns Converted
	 */
	static strings(request: unknown): string[] {
		return Array.isArray(request) ? request : [];
	}

	/**
	 * Convert to number type
	 *
	 * @param request - Request string
	 *
	 * @returns Converted
	 */
	static number(request: unknown): number | null {
		return typeof request === 'string' ? Number(request) : null;
	}

	/**
	 * Convert to boolean type
	 *
	 * @param request - Request string
	 *
	 * @returns Converted
	 */
	static boolean(request: unknown): boolean {
		return Boolean(request);
	}

	/**
	 * Convert to Dayjs type (YYYY-MM)
	 *
	 * @param request - Request string
	 *
	 * @returns Converted
	 */
	static dateYYYYMM(request: unknown): Dayjs | null {
		return typeof request === 'string' ? dayjs(new Date(Number(request.substring(0, 4)), Number(request.substring(5, 7)) - 1)) : null;
	}
}
