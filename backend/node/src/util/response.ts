import fs from 'node:fs';
import Log4js from 'log4js';
import { format, resolveConfig } from 'prettier';
import configureExpress from '../config/express.js';
import Compress from './Compress.js';
import HttpResponse from './HttpResponse.js';

const logger = Log4js.getLogger('response');

/**
 * 画面レンダリングを行い、同時に次回レスポンス時のために HTML ファイルを生成する
 *
 * @param htmlUnformat - HTML データ
 * @param options - オプション
 * @param options.filePath - HTML ファイルパス
 * @param options.brotliFilePath - HTML Brotli 圧縮ファイルパス
 * @param options.httpResponse - HttpResponse
 */
const response = async (
	htmlUnformat: string,
	options: Readonly<{
		filePath: string;
		brotliFilePath: string;
		httpResponse: HttpResponse;
	}>,
): Promise<void> => {
	const prettierOptions = await resolveConfig(options.filePath, { editorconfig: true });

	let html: string;
	if (prettierOptions === null) {
		logger.warn('Failed to resolve prettier config');
		html = htmlUnformat;
	} else {
		html = await format(htmlUnformat, prettierOptions);
	}

	const brotliData = Compress.brotliText(html);

	await Promise.all([
		/* レンダリング */
		options.httpResponse.send200({ body: html, brotliBody: brotliData, cacheControl: configureExpress.cacheControl }),

		/* HTML ファイル出力 */
		fs.promises.writeFile(options.filePath, html),
		fs.promises.writeFile(options.brotliFilePath, brotliData),
	]);
	logger.info('HTML file created', options.filePath);
	logger.info('HTML Brotli file created', options.brotliFilePath);
};

export default response;
