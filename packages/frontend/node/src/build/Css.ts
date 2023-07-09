import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';
import slash from 'slash';
import { globby } from 'globby';
import PrettierUtil from '@blog.w0s.jp/util/dist/PrettierUtil.js';
import BuildComponent from '../BuildComponent.js';
import type BuildComponentInterface from '../BuildComponentInterface.js';

/**
 * CSS 整形
 */
export default class Css extends BuildComponent implements BuildComponentInterface {
	async execute(args: string[]): Promise<void> {
		const filesPathOs = args.at(0);
		const distDirectoryOs = args.at(1);
		if (filesPathOs === undefined) {
			throw new Error('Missing parameter');
		}
		const filesPath = slash(filesPathOs);
		const distDirectory = distDirectoryOs !== undefined ? slash(distDirectoryOs) : undefined;

		const fileList = await globby(filesPath);

		const prettierOptions = PrettierUtil.configOverrideAssign(await PrettierUtil.loadConfig(this.config.prettier.config), '*.css');

		fileList.forEach(async (filePath) => {
			/* ファイル読み込み */
			const fileData = (await fs.promises.readFile(filePath)).toString();

			/* 整形 */
			let cssFormatted = fileData;
			try {
				cssFormatted = await prettier.format(fileData, prettierOptions);
			} catch (e) {
				console.error(`Prettier error: ${filePath}`, e);
			}

			/* 一時ファイル削除 */
			if (distDirectory !== undefined) {
				await fs.promises.unlink(filePath);
				console.info(`[Prettier] Temp file deleted: ${filePath}`);
			}

			/* 出力 */
			const distPath = distDirectory !== undefined ? `${distDirectory}/${path.basename(filePath)}` : filePath;
			await fs.promises.writeFile(distPath, cssFormatted);
			console.info(`[Prettier] File created: ${distPath}`);
		});
	}
}
