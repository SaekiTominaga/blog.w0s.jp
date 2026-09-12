import fs from 'node:fs';
import type { Context } from 'hono';
import { format, resolveConfig } from 'prettier';
import type { Variables } from '../app.ts';
import configHono from '../config/hono.ts';
import { brotliCompressText } from './compress.ts';
import { type CompressionCcoding, getCsp, getEntityTagWeak, supportCompressionEncoding } from './httpHeader.ts';

/**
 * 条件付きリクエストを検証する
 *
 * @param context - Hono Context
 * @param stats - fs.Stats
 *
 * @returns レスポンス
 */
const validateRequest = (context: Context<{ Variables: Variables }>, stats: fs.Stats): Response | undefined => {
	const { req, res } = context;

	const entityTag = getEntityTagWeak(stats);

	const conditionalHeaderValue = req.header('If-None-Match');
	if (conditionalHeaderValue === undefined || conditionalHeaderValue !== entityTag) {
		/* 初回訪問ないしサーバーキャッシュが更新されていた場合 */
		return undefined;
	}

	/* サーバーキャッシュが更新されていない場合 */
	res.headers.set('Cache-Control', configHono.response.header.cacheControl);
	res.headers.set('ETag', entityTag);
	return new Response(undefined, {
		status: 304,
	});
};

/**
 * Brotli ファイルパスを取得する
 *
 * @param filePath - HTML ファイルのパス
 *
 * @returns Brotli ファイルパス
 */
const getBrotliPath = (filePath: string): string => `${filePath}.br`;

/**
 * HTML コンテンツの共通ヘッダーを設定する
 *
 * @param headers - Headers
 * @param options -
 */
const setHeaders = (
	headers: Headers,
	options: {
		stats: fs.Stats;
		encoding: CompressionCcoding | undefined;
	},
): void => {
	headers.set('Content-Type', 'text/html; charset=utf-8');
	if (options.encoding !== undefined) {
		headers.set('Content-Encoding', options.encoding);
	}
	headers.set('Cache-Control', configHono.response.header.cacheControl);
	headers.set('Content-Security-Policy', getCsp(configHono.response.header.cspHtml));
	headers.set('Content-Security-Policy-Report-Only', getCsp(configHono.response.header.csproHtml));
	headers.set('ETag', getEntityTagWeak(options.stats));
	headers.append('Vary', 'Accept-Encoding');
};

/**
 * サーバーのキャッシュファイルがあればそれをレスポンスで返す
 *
 * @param context - Hono Context
 * @param htmlPath - HTML ファイルパス
 *
 * @returns レスポンス
 */
const readCache = async (context: Context<{ Variables: Variables }>, htmlPath: string): Promise<Response | undefined> => {
	const { req, res } = context;

	let filePath: string;
	let encoding: CompressionCcoding | undefined;
	if (supportCompressionEncoding(req.header('Accept-Encoding'), 'br')) {
		/* Brotli */
		filePath = getBrotliPath(htmlPath);
		encoding = 'br';
	} else {
		filePath = htmlPath;
	}

	let stats: fs.Stats;
	try {
		stats = await fs.promises.stat(filePath);
	} catch {
		/* サーバーキャッシュが存在しない場合 */
		return undefined;
	}

	const response = validateRequest(context, stats);
	if (response !== undefined) {
		return response;
	}

	/* 生成済みのサーバーキャッシュファイルを読み取る */
	const responseBody = await fs.promises.readFile(filePath);

	setHeaders(res.headers, {
		stats: stats,
		encoding: encoding,
	});
	return context.body(responseBody);
};

/**
 * HTML を整形する
 *
 * @param context - Hono Context
 * @param html - HTML
 * @param html.path - ファイルパス
 * @param html.data - データ
 *
 * @returns レスポンス
 */
const htmlFormat = async (
	context: Context<{ Variables: Variables }>,
	html: Readonly<{
		path: string;
		data: string;
	}>,
): Promise<string> => {
	const logger = context.get('logger');

	const prettierOptions = await resolveConfig(html.path, { editorconfig: true });
	if (prettierOptions === null) {
		logger.warn('Failed to resolve prettier config');
		return html.data;
	}

	return format(html.data, prettierOptions);
};

/**
 * サーバーキャッシュファイルを生成する
 *
 * @param context - Hono Context
 * @param html - HTML
 * @param html.path - ファイルパス
 * @param html.data - データ
 *
 * @returns レスポンス
 */
const createCache = async (
	context: Context<{ Variables: Variables }>,
	html: Readonly<{
		path: string;
		data: string;
	}>,
): Promise<Response> => {
	const { req, res } = context;
	const logger = context.get('logger');

	const htmlFormattedData = await htmlFormat(context, html);

	const brotliData = await brotliCompressText(htmlFormattedData);

	/* キャッシュ HTML ファイル出力 */
	const brotliFilePath = getBrotliPath(html.path);

	await Promise.all([fs.promises.writeFile(html.path, htmlFormattedData), fs.promises.writeFile(brotliFilePath, brotliData)]);
	logger.info(`HTML file created: ${html.path}`);
	logger.info(`HTML Brotli file created: ${brotliFilePath}`);

	/* レンダリング */
	let filePath: string;
	let data: string | Uint8Array<ArrayBuffer>;
	let encoding: CompressionCcoding | undefined;
	if (supportCompressionEncoding(req.header('Accept-Encoding'), 'br')) {
		/* Brotli */
		filePath = brotliFilePath;
		data = Buffer.from(brotliData);
		encoding = 'br';
	} else {
		filePath = html.path;
		data = htmlFormattedData;
	}

	setHeaders(res.headers, {
		stats: await fs.promises.stat(filePath),
		encoding: encoding,
	});
	return context.body(data);
};

export { readCache, createCache };
