import fs from 'node:fs';
import Log4js from 'log4js';
import prettier from 'prettier';
import PrettierUtil from '@blog.w0s.jp/util/dist/PrettierUtil.js';
import Compress from './util/Compress.js';
import HttpResponse from './util/HttpResponse.js';
import { NoName as Configure } from '../../configure/type/common.js';

export default class Controller {
	protected readonly logger: Log4js.Logger; // Logger

	protected readonly configCommon: Configure; // 共通設定

	/**
	 * @param configCommon - 共通設定
	 */
	constructor(configCommon: Configure) {
		/* Logger */
		this.logger = Log4js.getLogger(this.constructor.name);

		/* 共通設定 */
		this.configCommon = configCommon;
	}

	/**
	 * 画面レンダリングを行い、同時に次回レスポンス時のために HTML ファイルを生成する
	 *
	 * @param html - HTML データ
	 * @param options - オプション
	 * @param options.filePath - HTML ファイルパス
	 * @param options.brotliFilePath - HTML Brotli 圧縮ファイルパス
	 * @param options.prettierConfig - Pritter 構成ファイルパス
	 * @param options.httpResponse - HttpResponse
	 */
	async response(html: string, options: { filePath: string; brotliFilePath: string; prettierConfig: string; httpResponse: HttpResponse }): Promise<void> {
		const prettierOptions = PrettierUtil.configOverrideAssign(await PrettierUtil.loadConfig(options.prettierConfig), '*.html');

		const formattedData = (await prettier.format(html, prettierOptions)).trim();

		const brotliData = Compress.brotliText(formattedData);

		await Promise.all([
			/* レンダリング */
			options.httpResponse.send200({ body: formattedData, brotliBody: brotliData }),

			/* HTML ファイル出力 */
			this.#fileWrite(options.filePath, formattedData),
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
