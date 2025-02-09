type CompressionCcoding = 'gzip' | 'compress' | 'deflate' | 'br' | 'zstd'; // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding#directives

/**
 * 指定されたエンコーディングをサポートしているかどうか
 *
 * @param acceptEncoding - `Accept-Encoding` ヘッダーの値
 * @param searchCoding - 調査する圧縮形式の値
 *
 * @returns サポートしていれば true
 */
export const supportCompressionEncoding = (acceptEncoding: string | undefined, searchCoding: CompressionCcoding): boolean => {
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
 * `Content-Security-Policy`, `Content-Security-Policy-Report-Only`
 *
 * @param object - オブジェクトで構造化されたデータ
 *
 * @returns ヘッダー値
 */
export const csp = (object: Record<string, string[]>): string =>
	Object.entries(object)
		.map(([key, values]) => `${key} ${values.join(' ')}`)
		.join(';');

/**
 * `Reporting-Endpoints`
 *
 * @param object - オブジェクトで構造化されたデータ
 *
 * @returns ヘッダー値
 */
export const reportingEndpoints = (object: Record<string, string>): string =>
	Object.entries(object)
		.map(([key, value]) => `${key}="${value}"`)
		.join(',');
