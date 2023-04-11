import fs from 'fs';
import Log4js from 'log4js';
import nodemailer from 'nodemailer';
import { MLEngine } from 'markuplint';
import prettier from 'prettier';
import Compress from './util/Compress.js';
import HttpResponse from './util/HttpResponse.js';
import PrettierUtil from './util/PrettierUtil.js';
import { NoName as Configure } from '../configure/type/common.js';

export default class Controller {
	protected readonly logger: Log4js.Logger; // Logger

	protected readonly configCommon: Configure; // 共通設定

	/**
	 * @param {Configure} configCommon - 共通設定
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
			this.#fileWrite(options.filePath, formattedData),
			this.#brotliFileWrite(options.brotliFilePath, brotliData),
		]);
	}

	/**
	 * HTML ファイルへの書き込みを行う
	 *
	 * @param {string} filePath - ファイルパス
	 * @param {string | Buffer} data - データ
	 */
	async #fileWrite(filePath: string, data: string | Buffer): Promise<void> {
		await fs.promises.writeFile(filePath, data);
		this.logger.info('HTML file created', filePath);

		/* Lint */
		const mlFile = await MLEngine.toMLFile(filePath);
		if (mlFile !== undefined) {
			const engine = new MLEngine(mlFile);

			const result = await engine.exec();
			if (result !== null && result.violations.length > 0) {
				/* 結果をメール通知 */
				const transporter = nodemailer.createTransport({
					host: this.configCommon.mail.smtp,
					port: this.configCommon.mail.port,
					auth: {
						user: this.configCommon.mail.user,
						pass: this.configCommon.mail.password,
					},
				});

				const info = await transporter.sendMail({
					from: this.configCommon.mail.from,
					to: this.configCommon.mail.to,
					subject: this.configCommon.markuplint.mail_title,
					text: `${filePath}\n${result.violations
						.map(
							(violation) => `
${violation.raw}
${violation.message}
line: ${violation.line}, col: ${violation.col}
`
						)
						.join('------------------------------')}`,
				});

				this.logger.info('Message sent: %s', info.messageId);
			}
		}
	}

	/**
	 * HTML Brotli ファイルへの書き込みを行う
	 *
	 * @param {string} filePath - ファイルパス
	 * @param {string | Buffer} data - データ
	 */
	async #brotliFileWrite(filePath: string, data: string | Buffer): Promise<void> {
		await fs.promises.writeFile(filePath, data);
		this.logger.info('HTML Brotli file created', filePath);
	}
}
