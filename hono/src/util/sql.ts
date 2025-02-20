type JSType = string | number | boolean | Date | URL | undefined;
type SQLiteType = string | number | null; // https://www.sqlite.org/datatype3.html

/**
 * JavaScript の型から SQLite 用の型へ変換する
 *
 * @param value - JavaScript の型による値
 *
 * @returns SQLite 用の型による値
 */
export function jsToSQLite(value: JSType): SQLiteType {
	if (value === undefined) {
		return null;
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return value;
	}
	if (typeof value === 'boolean') {
		return value ? 1 : 0;
	}
	if (value instanceof Date) {
		return Math.round(value.getTime() / 1000); // Unix Time, the number of seconds
	}
	if (value instanceof URL) {
		return value.toString();
	}

	return value;
}

export function sqliteToJS(value: string): string;
export function sqliteToJS(value: string | null): string | undefined;
export function sqliteToJS(value: number): number;
export function sqliteToJS(value: number | null): number | undefined;
export function sqliteToJS(value: number, type: 'boolean'): boolean;
export function sqliteToJS(value: number | null, type: 'boolean'): boolean | undefined;
export function sqliteToJS(value: number, type: 'date'): Date;
export function sqliteToJS(value: number | null, type: 'date'): Date | undefined;
export function sqliteToJS(value: string, type: 'url'): URL;
export function sqliteToJS(value: string | null, type: 'url'): URL | undefined;

/**
 * SQLite の型から JavaScript 用の型へ変換する
 *
 * @param value - SQLite の型による値
 * @param type - 変換する型
 *
 * @returns JavaScript 用の型による値
 */
export function sqliteToJS(value: SQLiteType, type?: 'boolean' | 'date' | 'url'): JSType {
	if (value === null) {
		return undefined;
	}
	switch (type) {
		case 'boolean': {
			if (typeof value === 'number' && (value === 0 || value === 1)) {
				return Boolean(value);
			}
			throw new Error('Database columns must be a 0 or 1 when convert to a boolean type');
		}
		case 'date': {
			if (typeof value === 'number' && Number.isInteger(value)) {
				return new Date(value * 1000);
			}
			throw new Error('Database columns must be a integer when convert to a Date type');
		}
		case 'url': {
			if (typeof value !== 'string') {
				throw new Error('Database columns must be a string type when convert to a URL type');
			}
			return new URL(value);
		}
		default:
	}

	return value;
}

/**
 * SELECT 文用の Prepared statement
 *
 * @param where - キーにテーブルのカラム名、値にカラムに格納する値をセットしたオブジェクト
 *
 * @returns WHERE 句の文字列と bind で使用するオブジェクト
 */
export const prepareSelect = (where: Readonly<Record<string, JSType>>): { sqlWhere: string; bindParams: Record<string, SQLiteType> } => {
	const whereArray = Object.entries(where);

	const sqlWhere = whereArray
		.map(([key, value]) => {
			if (value === undefined) {
				return `${key} IS NULL`;
			}
			return `${key} = :${key}`;
		})
		.join(' AND ');

	const bindParams = Object.fromEntries(whereArray.filter(([, value]) => value !== undefined).map(([key, value]) => [`:${key}`, jsToSQLite(value)]));

	return {
		sqlWhere: sqlWhere,
		bindParams: bindParams,
	};
};

/**
 * INSERT 文用の Prepared statement
 *
 * @param into - キーにテーブルのカラム名、値にカラムに格納する値をセットしたオブジェクト
 *
 * @returns bind で使用するオブジェクト
 */
export const prepareInsert = (into: Readonly<Record<string, JSType>>): { sqlInto: string; sqlValues: string; bindParams: Record<string, SQLiteType> } => {
	const intoArray = Object.entries(into);

	const sqlInto = `(${intoArray.map(([key]) => key).join(', ')})`;
	const sqlValues = `(${intoArray.map(([key]) => `:${key}`).join(', ')})`;

	const bindParams = Object.fromEntries(intoArray.map(([key, value]) => [`:${key}`, jsToSQLite(value)]));

	return {
		sqlInto: sqlInto,
		sqlValues: sqlValues,
		bindParams: bindParams,
	};
};

/**
 * UPDATE 文用の Prepared statement
 *
 * @param set - キーにテーブルのカラム名、値にカラムに格納する値をセットしたオブジェクト
 * @param where - キーにテーブルのカラム名、値にカラムに格納する値をセットしたオブジェクト
 *
 * @returns bind で使用するオブジェクト
 */
export const prepareUpdate = (
	set: Readonly<Record<string, JSType>>,
	where: Readonly<Record<string, JSType>>,
): { sqlSet: string; sqlWhere: string; bindParams: Record<string, SQLiteType> } => {
	const setArray = Object.entries(set);
	const whereArray = Object.entries(where);

	const sqlSet = setArray
		.map(([key]) => `${key} = :${key}`)
		.join(', ');

	const sqlWhere = whereArray
		.map(([key, value]) => {
			if (value === undefined) {
				return `${key} IS NULL`;
			}
			return `${key} = :${key}`;
		})
		.join(' AND ');

	const bindParams = Object.fromEntries([...setArray, ...whereArray].map(([key, value]) => [`:${key}`, jsToSQLite(value)]));

	return {
		sqlSet: sqlSet,
		sqlWhere: sqlWhere,
		bindParams: bindParams,
	};
};

/**
 * DELETE 文用の Prepared statement
 *
 * @param where - キーにテーブルのカラム名、値にカラムに格納する値をセットしたオブジェクト
 *
 * @returns WHERE 句の文字列と bind で使用するオブジェクト
 */
export const prepareDelete = (where: Readonly<Record<string, JSType>>): { sqlWhere: string; bindParams: Record<string, SQLiteType> } => prepareSelect(where);
