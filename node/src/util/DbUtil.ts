import dayjs, { Dayjs } from 'dayjs';

/**
 * Database Utility
 */
export default class DbUtil {
	/**
	 * Converting an empty string to null
	 *
	 * @param {string | null} string - character string
	 *
	 * @returns {string | null} character string
	 */
	static emptyToNull(string: string | null): string | null {
		return string !== '' ? string : null;
	}

	/**
	 * Convert `Date` to UNIX time
	 *
	 * @param {Date | null | undefined} date - Date (If not specified, returns the current time)
	 *
	 * @returns {number | null} UNIX time
	 */
	static dateToUnix(date?: Date | null): number | null {
		if (date === null) {
			return null;
		}
		return Math.round((date?.getTime() ?? Date.now()) / 1000);
	}

	/**
	 * Convert `Dayjs` to UNIX time
	 *
	 * @param {Dayjs | null | undefined} date - Dayjs (If not specified, returns the current time)
	 *
	 * @returns {number | null} UNIX time
	 */
	static dayjsToUnix(date?: Dayjs | null): number | null {
		if (date === null) {
			return null;
		}
		if (date === undefined) {
			return Math.round(Date.now() / 1000);
		}
		return date.unix();
	}

	/**
	 * Convert UNIX time to `Date`
	 *
	 * @param {number | null} unix - UNIX time
	 *
	 * @returns {Date | null} Date
	 */
	static unixToDate(unix: number | null): Date | null {
		if (unix === null) {
			return null;
		}
		return new Date(unix * 1000);
	}

	/**
	 * Convert UNIX time to `Dayjs`
	 *
	 * @param {number | null} unix - UNIX time
	 *
	 * @returns {Dayjs | null} Dayjs
	 */
	static unixToDayjs(unix: number | null): Dayjs | null {
		if (unix === null) {
			return null;
		}
		return dayjs(unix * 1000);
	}
}
