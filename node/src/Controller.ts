import fs from 'fs';
import Log4js from 'log4js';
import prettier from 'prettier';
import Compress from './util/Compress.js';
import HttpResponse from './util/HttpResponse.js';
import PrettierUtil from './util/PrettierUtil.js';

export default class Controller {
	protected readonly logger: Log4js.Logger; // Logger

	constructor() {
		/* Logger */
		this.logger = Log4js.getLogger(this.constructor.name);
	}

	/**
	 * 画面レンダリングを行い、同時に次回レスポンス時のために HTML ファイルを生成する
	 *
	 * @param {string} html - HTML データ
	 * @param {object} options - オプション
	 * @param {string} options.filePath - HTML ファイルパス
	 * @param {string} options.brotliFilePath - HTML Brotli 圧縮ファイルパス
	 * @param {string} options.prettierConfig - Pritter 構成ファイルパス
	 * @param {string} options.httpResponse - HttpResponse
	 */
	async response(html: string, options: { filePath: string; brotliFilePath: string; prettierConfig: string; httpResponse: HttpResponse }): Promise<void> {
		const prettierOptions = await PrettierUtil.getOptions(options.prettierConfig, 'html', '*.html');

		const formattedData = prettier.format(html, prettierOptions).trim();

		const brotliData = Compress.brotliText(formattedData);

		await Promise.all([
			/* レンダリング */
			options.httpResponse.send200({ body: formattedData, brotliBody: brotliData }),

			/* HTML ファイル出力 */
			fs.promises.writeFile(options.filePath, formattedData),
			fs.promises.writeFile(options.brotliFilePath, brotliData),
		]);

		this.logger.info('HTML file created', options.filePath);
		this.logger.info('HTML Brotli file created', options.brotliFilePath);
	}
}
