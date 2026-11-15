import type fs from 'node:fs';

type CompressionCoding = 'gzip' | 'deflate' | 'br' | 'zstd'; // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding#directives

/**
 * 指定されたエンコーディングをサポートしているかどうか
 *
 * @param acceptEncoding - `Accept-Encoding` ヘッダーの値
 * @param searchCoding - 調査する圧縮形式の値
 *
 * @returns サポートしていれば true
 */
const supportCompressionEncoding = (acceptEncoding: string | undefined, searchCoding: CompressionCoding): boolean => {
	if (acceptEncoding === undefined) {
		return false;
	}

	const codings = acceptEncoding
		.split(',')
		.map((coding) => coding.split(';').at(0)?.trim()) // quality value を除去
		.filter((coding) => coding !== undefined);
	return codings.includes(searchCoding);
};

/**
 * [リクエストヘッダー] `X-Forwarded-For` フィールドの値を解析する
 *
 * @param value - `X-Forwarded-For` フィールドの値
 *
 * @returns `X-Forwarded-For` フィールドの値
 */
const parseXForwardedFor = (value: string | undefined): string[] | undefined => {
	if (value === undefined) {
		return undefined;
	}

	return value
		.split(',')
		.map((ip) => ip.trim())
		.filter((ip) => ip.length > 0);
};

/**
 * [レスポンスヘッダー] `Content-Security-Policy`, `Content-Security-Policy-Report-Only` フィールドの値を生成する
 *
 * @param object - オブジェクトで構造化されたデータ
 *
 * @returns フィールド値
 */
const getCsp = (object: Readonly<Record<string, readonly string[]>>): string =>
	Object.entries(object)
		.map(([key, values]) => `${key} ${values.join(' ')}`)
		.join(';');

/**
 * [レスポンスヘッダー] `ETag` フィールドの値を生成する（弱いバリデーター）
 *
 * @param stat - fs.Stats
 *
 * @returns フィールド値（ファイルが存在しない場合は undefined）
 */
const getEntityTagWeak = (stat: fs.Stats): string => `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;

/**
 * [レスポンスヘッダー] `Reporting-Endpoints` フィールドの値を生成する
 *
 * @param object - オブジェクトで構造化されたデータ
 *
 * @returns フィールド値
 */
const getReportingEndpoints = (object: Readonly<Record<string, string>>): string =>
	Object.entries(object)
		.map(([key, value]) => `${key}="${value}"`)
		.join(',');

export type { CompressionCoding };
export { supportCompressionEncoding, parseXForwardedFor, getCsp, getEntityTagWeak, getReportingEndpoints };
