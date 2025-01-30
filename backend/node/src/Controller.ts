import fs from 'node:fs';
import Log4js from 'log4js';
import { format, resolveConfig } from 'prettier';
import configureExpress from './config/express.js';
import Compress from './util/Compress.js';
import HttpResponse from './util/HttpResponse.js';

export default class Controller {
	protected readonly logger: Log4js.Logger; // Logger

	constructor() {
		/* Logger */
		this.logger = Log4js.getLogger(this.constructor.name);
	}

	/**
	 * 画面レンダリングを行い、同時に次回レスポンス時のために HTML ファイルを生成する
	 *
	 * @param htmlUnformat - HTML データ
	 * @param options - オプション
	 * @param options.filePath - HTML ファイルパス
	 * @param options.brotliFilePath - HTML Brotli 圧縮ファイルパス
	 * @param options.httpResponse - HttpResponse
	 */
	async response(
		htmlUnformat: string,
		options: {
			filePath: string;
			brotliFilePath: string;
			httpResponse: HttpResponse;
		},
	): Promise<void> {
		const prettierOptions = await resolveConfig(options.filePath, { editorconfig: true });

		let html: string;
		if (prettierOptions === null) {
			this.logger.warn('Failed to resolve prettier config');
			html = htmlUnformat;
		} else {
			html = await format(htmlUnformat, prettierOptions);
		}

		const brotliData = Compress.brotliText(html);

		await Promise.all([
			/* レンダリング */
			options.httpResponse.send200({ body: html, brotliBody: brotliData, cacheControl: configureExpress.cacheControl }),

			/* HTML ファイル出力 */
			this.#fileWrite(options.filePath, html),
			this.#brotliFileWrite(options.brotliFilePath, brotliData),
		]);
	}

	/**
	 * HTML ファイルへの書き込みを行う
	 *
	 * @param filePath - ファイルパス
	 * @param data - データ
	 */
	async #fileWrite(filePath: string, data: string | Buffer): Promise<void> {
		await fs.promises.writeFile(filePath, data);
		this.logger.info('HTML file created', filePath);
	}

	/**
	 * HTML Brotli ファイルへの書き込みを行う
	 *
	 * @param filePath - ファイルパス
	 * @param data - データ
	 */
	async #brotliFileWrite(filePath: string, data: string | Buffer): Promise<void> {
		await fs.promises.writeFile(filePath, data);
		this.logger.info('HTML Brotli file created', filePath);
	}
}
