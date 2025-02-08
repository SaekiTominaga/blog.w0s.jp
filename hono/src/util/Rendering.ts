import fs from 'node:fs';
import type { Context } from 'hono';
import Log4js from 'log4js';
import { format, resolveConfig } from 'prettier';
import configHono from '../config/hono.js';
import { brotliCompressText } from './compress.js';
import { csp as cspHeader, supportCompressionEncoding } from './httpHeader.js';

export default class Rendering {
	readonly #logger: Log4js.Logger;

	readonly #context: Context;

	readonly #lastModified: Date;

	readonly #htmlFilePath: string;

	readonly #htmlBrotliFilePath: string;

	/**
	 * @param context - Context
	 * @param lastModified - 今回のアクセスに対して発行する最終更新日時
	 * @param htmlFilePath - HTML ファイルパス
	 */
	constructor(context: Context, lastModified: Date, htmlFilePath: string) {
		this.#logger = Log4js.getLogger('response');

		this.#context = context;

		this.#lastModified = lastModified;

		this.#htmlFilePath = htmlFilePath;

		this.#htmlBrotliFilePath = `${htmlFilePath}${configHono.extension.brotli}`;
	}

	/**
	 * 最終更新日時を確認する（ドキュメントに変更がなければ 304 を返して終了、変更があれば Last-Modified ヘッダをセットする）
	 *
	 * @returns レスポンス
	 */
	checkLastModified(): Response | null {
		const { req, res } = this.#context;

		const ifModifiedSince = req.header('If-Modified-Since');
		if (ifModifiedSince !== undefined && this.#lastModified <= new Date(ifModifiedSince)) {
			this.#logger.debug('304 Not Modified');

			res.headers.set('Cache-Control', configHono.cacheControl);

			return new Response(null, {
				status: 304,
			});
		}

		res.headers.set('Last-Modified', this.#lastModified.toUTCString());
		return null;
	}

	/**
	 * サーバーのキャッシュファイルがあればそれをレスポンスで返す
	 *
	 * @returns レスポンス
	 */
	async serverCache(): Promise<Response | null> {
		const { req, res } = this.#context;

		const response304 = this.checkLastModified();
		if (response304 !== null) {
			return response304;
		}

		if (fs.existsSync(this.#htmlFilePath) && this.#lastModified <= (await fs.promises.stat(this.#htmlFilePath)).mtime) {
			/* 生成済みのキャッシュ HTML ファイルを活用してレンダリング */

			if (supportCompressionEncoding(req.header('Accept-Encoding'), 'br')) {
				const responseBody = await fs.promises.readFile(this.#htmlBrotliFilePath);

				res.headers.set('Content-Encoding', 'br');
				Rendering.#setHeaders(res.headers);
				return this.#context.body(responseBody);
			}

			const responseBody = await fs.promises.readFile(this.#htmlFilePath);

			Rendering.#setHeaders(res.headers);
			return this.#context.body(responseBody);
		}

		return null;
	}

	/**
	 * 画面レンダリングと同時に次回レスポンス時のために HTML ファイルを生成する
	 *
	 * @param htmlData - HTML データ
	 *
	 * @returns レスポンス
	 */
	async generation(htmlData: string): Promise<Response> {
		const { req, res } = this.#context;

		const prettierOptions = await resolveConfig(this.#htmlFilePath, { editorconfig: true });

		let htmlFormatted = htmlData;
		if (prettierOptions !== null) {
			htmlFormatted = await format(htmlData, prettierOptions);
		} else {
			this.#logger.warn('Failed to resolve prettier config');
		}

		const brotliData = brotliCompressText(htmlFormatted);

		/* キャッシュ HTML ファイル出力 */
		await Promise.all([fs.promises.writeFile(this.#htmlFilePath, htmlFormatted), fs.promises.writeFile(this.#htmlBrotliFilePath, brotliData)]);
		this.#logger.info('HTML file created', this.#htmlFilePath);
		this.#logger.info('HTML Brotli file created', this.#htmlBrotliFilePath);

		/* レンダリング */
		if (supportCompressionEncoding(req.header('Accept-Encoding'), 'br')) {
			res.headers.set('Content-Encoding', 'br');
			Rendering.#setHeaders(res.headers);
			return this.#context.body(brotliData);
		}

		Rendering.#setHeaders(res.headers);
		return this.#context.body(htmlFormatted);
	}

	/**
	 * HTML コンテンツの共通ヘッダーを設定する
	 *
	 * @param headers - Headers
	 */
	static #setHeaders(headers: Headers): void {
		headers.set('Content-Type', 'text/html; charset=utf-8');
		headers.set('Cache-Control', configHono.cacheControl);
		headers.set('Content-Security-Policy', cspHeader(configHono.response.header.cspHtml));
		headers.set('Content-Security-Policy-Report-Only', cspHeader(configHono.response.header.csproHtml));
		headers.append('Vary', 'Accept-Encoding');
	}
}
