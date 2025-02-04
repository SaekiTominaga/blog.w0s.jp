import fs from 'node:fs';
import type { Context } from 'hono';
import Log4js from 'log4js';
import { format, resolveConfig } from 'prettier';
import configHono from '../config/hono.js';
import { brotliCompressText } from './compress.js';
import { csp as cspHeader, supportCompressionEncoding } from './httpHeader.js';

const CONTENT_TYPE_HTML = 'text/html; charset=utf-8';

const logger = Log4js.getLogger('response');

/**
 * 画面レンダリングを行う
 *
 * @param context - Context
 * @param body - レスポンスボディ情報
 * @param body.body - HTML 内容
 * @param body.brotli - Brotli 内容
 * @param body.htmlPath - HTML ファイルパス
 * @param body.brotliPath - Brotli ファイルパス
 *
 * @returns レスポンス
 */
export const rendering = async (
	context: Context,
	body: Readonly<{
		html?: string | Buffer;
		brotli?: string | Buffer;
		htmlPath?: string;
		brotliPath?: string;
	}>,
): Promise<Response> => {
	const { req, res } = context;

	res.headers.set('Content-Type', CONTENT_TYPE_HTML);
	res.headers.set('Cache-Control', configHono.cacheControl);
	res.headers.set('Content-Security-Policy', cspHeader(configHono.response.header.cspHtml));
	res.headers.set('Content-Security-Policy-Report-Only', cspHeader(configHono.response.header.csproHtml));

	/* Brotli 圧縮 */
	if (supportCompressionEncoding(req.header('Accept-Encoding'), 'br')) {
		let responseBody = body.brotli;
		if (responseBody === undefined && body.brotliPath !== undefined) {
			responseBody = await fs.promises.readFile(body.brotliPath);
		}

		if (responseBody !== undefined) {
			res.headers.set('Content-Encoding', 'br');
			return context.body(responseBody);
		}
	}

	/* 無圧縮 */
	let responseBody = body.html;
	if (responseBody === undefined && body.htmlPath !== undefined) {
		responseBody = await fs.promises.readFile(body.htmlPath);
	}

	if (responseBody !== undefined) {
		return context.body(responseBody);
	}

	throw new Error('Neither the response data body nor the file path is specified');
};

/**
 * 画面レンダリングと同時に次回レスポンス時のために HTML ファイルを生成する
 *
 * @param context - Context
 * @param html - HTML データ
 * @param options - オプション
 * @param options.filePath - HTML ファイルパス
 * @param options.brotliFilePath - HTML Brotli 圧縮ファイルパス
 *
 * @returns レスポンス
 */
export const generation = async (
	context: Context,
	html: string,
	options: Readonly<{
		htmlPath: string;
		brotliPath: string;
	}>,
): Promise<Response> => {
	const prettierOptions = await resolveConfig(options.htmlPath, { editorconfig: true });

	let htmlFormatted = html;
	if (prettierOptions !== null) {
		htmlFormatted = await format(html, prettierOptions);
	} else {
		logger.warn('Failed to resolve prettier config');
	}

	const brotliData = brotliCompressText(htmlFormatted);

	const [response] = await Promise.all([
		/* レンダリング */
		rendering(context, { html: htmlFormatted, brotli: brotliData }),

		/* HTML ファイル出力 */
		fs.promises.writeFile(options.htmlPath, htmlFormatted),
		fs.promises.writeFile(options.brotliPath, brotliData),
	]);
	logger.info('HTML file created', options.htmlPath);
	logger.info('HTML Brotli file created', options.brotliPath);

	return response;
};

/**
 * 最終更新日時を確認する（ドキュメントに変更がなければ 304 を返して終了、変更があれば Last-Modified ヘッダをセットする）
 *
 * @param context - Context
 * @param lastModified - 今回のアクセスに対して発行する最終更新日時
 *
 * @returns レスポンス
 */
export const checkLastModified = (context: Context, lastModified: Date): Response | null => {
	const { req, res } = context;

	const ifModifiedSince = req.header('If-Modified-Since');
	if (ifModifiedSince !== undefined && lastModified <= new Date(ifModifiedSince)) {
		logger.debug('304 Not Modified');

		res.headers.set('Cache-Control', configHono.cacheControl);

		return new Response(null, {
			status: 304,
		});
	}

	res.headers.set('Last-Modified', lastModified.toUTCString());
	return null;
};
