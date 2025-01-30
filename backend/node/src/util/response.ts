import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import Log4js from 'log4js';
import { format, resolveConfig } from 'prettier';
import configExpress from '../config/express.js';
import { brotliCompressText } from './compress.js';

const CONTENT_TYPE_HTML = 'text/html; charset=utf-8';

const logger = Log4js.getLogger('response');

/**
 * 画面レンダリングを行う
 *
 * @param req - Request
 * @param res - Response
 * @param body - レスポンスボディ情報
 * @param body.body - HTML 内容
 * @param body.brotli - Brotli 内容
 * @param body.htmlPath - HTML ファイルパス
 * @param body.brotliPath - Brotli ファイルパス
 * @param header - レスポンスヘッダー情報
 * @param header.cacheControl - Cache-Control ヘッダーフィールド値
 */
export const rendering = async (
	req: Request,
	res: Response,
	body: Readonly<{
		html?: string | Buffer;
		brotli?: string | Buffer;
		htmlPath?: string;
		brotliPath?: string;
	}>,
) => {
	res
		.set('Content-Type', CONTENT_TYPE_HTML)
		.set('Cache-Control', configExpress.cacheControl)
		.set(
			'Content-Security-Policy',
			Object.entries(configExpress.response.header.cspHtml)
				.map(([key, values]) => `${key} ${values.join(' ')}`)
				.join(';'),
		)
		.set(
			'Content-Security-Policy-Report-Only',
			Object.entries(configExpress.response.header.csproHtml)
				.map(([key, values]) => `${key} ${values.join(' ')}`)
				.join(';'),
		);

	/* Brotli 圧縮 */
	if (req.acceptsEncodings('br') === 'br') {
		let responseBody = body.brotli;
		if (responseBody === undefined && body.brotliPath !== undefined) {
			responseBody = await fs.promises.readFile(body.brotliPath);
		}

		if (responseBody !== undefined) {
			res.set('Content-Encoding', 'br').send(responseBody);
			return;
		}
	}

	/* 無圧縮 */
	let responseBody = body.html;
	if (responseBody === undefined && body.htmlPath !== undefined) {
		responseBody = await fs.promises.readFile(body.htmlPath);
	}

	if (responseBody !== undefined) {
		res.send(responseBody);
		return;
	}

	throw new Error('Neither the response data body nor the file path is specified');
};

/**
 * 画面レンダリングと同時に次回レスポンス時のために HTML ファイルを生成する
 *
 * @param req - Request
 * @param res - Response
 * @param html - HTML データ
 * @param options - オプション
 * @param options.filePath - HTML ファイルパス
 * @param options.brotliFilePath - HTML Brotli 圧縮ファイルパス
 */
export const generation = async (
	req: Request,
	res: Response,
	html: string,
	options: Readonly<{
		htmlPath: string;
		brotliPath: string;
	}>,
): Promise<void> => {
	const prettierOptions = await resolveConfig(options.htmlPath, { editorconfig: true });

	let htmlFormatted = html;
	if (prettierOptions !== null) {
		htmlFormatted = await format(html, prettierOptions);
	} else {
		logger.warn('Failed to resolve prettier config');
	}

	const brotliData = brotliCompressText(htmlFormatted);

	await Promise.all([
		/* レンダリング */
		rendering(req, res, { html: htmlFormatted, brotli: brotliData }),

		/* HTML ファイル出力 */
		fs.promises.writeFile(options.htmlPath, htmlFormatted),
		fs.promises.writeFile(options.brotliPath, brotliData),
	]);
	logger.info('HTML file created', options.htmlPath);
	logger.info('HTML Brotli file created', options.brotliPath);
};

/**
 * 最終更新日時を確認する（ドキュメントに変更がなければ 304 を返して終了、変更があれば Last-Modified ヘッダをセットする）
 *
 * @param req - Request
 * @param res - Response
 * @param lastModified - 今回のアクセスに対して発行する最終更新日時
 *
 * @returns ドキュメントに変更がなければ true
 */
export const checkLastModified = (req: Request, res: Response, lastModified: Date): boolean => {
	const ifModifiedSince = req.get('If-Modified-Since');
	if (ifModifiedSince !== undefined && lastModified <= new Date(ifModifiedSince)) {
		logger.debug('304 Not Modified');
		res.status(304).set('Cache-Control', configExpress.cacheControl).end();
		return true;
	}

	res.set('Last-Modified', lastModified.toUTCString());
	return false;
};

/**
 * 403 Forbidden
 *
 * @param res - Response
 */
export const rendering403 = (res: Response): void => {
	res.status(403).set('Content-Type', CONTENT_TYPE_HTML).sendFile(path.resolve(configExpress.errorpage.path403));
};

/**
 * 404 Not Found
 *
 * @param res - Response
 */
export const rendering404 = (res: Response): void => {
	res.status(404).set('Content-Type', CONTENT_TYPE_HTML).sendFile(path.resolve(configExpress.errorpage.path404));
};

/**
 * 500 Internal Server Error
 *
 * @param res - Response
 */
export const rendering500 = (res: Response): void => {
	res.status(500).set('Content-Type', CONTENT_TYPE_HTML).sendFile(path.resolve(configExpress.errorpage.path500));
};
