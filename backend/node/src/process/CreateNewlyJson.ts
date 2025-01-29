import fs from 'node:fs';
import configExpress from '../config/express.js';
import BlogNewlyJsonDao from '../dao/BlogNewlyJsonDao.js';
import MarkdownTitle from '../markdown/Title.js';
import Compress from '../util/Compress.js';
import { env } from '../util/env.js';
import type { JSON as Configure } from '../../../configure/type/newly-json.js';

/**
 * 新着 JSON ファイル生成
 */
export default class CreateNewlyJson {
	readonly #config: Configure; // 機能設定

	constructor() {
		this.#config = JSON.parse(fs.readFileSync('configure/newly-json.json', 'utf8')) as Configure;
	}

	/**
	 * @returns ファイル生成情報
	 */
	async execute(): Promise<{
		createdFilesPath: string[]; // 生成したファイルパス
	}> {
		const dao = new BlogNewlyJsonDao(env('SQLITE_BLOG'));

		const datasCatgroup = new Map<string, BlogView.NewlyEntry[]>();

		datasCatgroup.set('', await dao.getEntries(this.#config.limit));

		await Promise.all(
			(await dao.getCategoryGroupMasterFileName()).map(async (fileName) => {
				datasCatgroup.set(fileName, await dao.getEntries(this.#config.limit, fileName));
			}),
		);

		const createdFilesPath: string[] = [];

		await Promise.all(
			[...datasCatgroup].map(async ([fileNameType, datas]) => {
				const newlyJson = JSON.stringify(
					datas.map((data) => ({
						id: data.id,
						title: new MarkdownTitle(data.title).mark(),
					})),
				);

				const newlyJsonBrotli = Compress.brotliText(newlyJson);

				/* ファイル出力 */
				const fileName =
					fileNameType === '' ? this.#config.filename_prefix : `${this.#config.filename_prefix}${this.#config.filename_separator}${fileNameType}`;
				const filePath = `${configExpress.static.root}/${this.#config.directory}/${fileName}${configExpress.extension.json}`;
				const brotliFilePath = `${filePath}${configExpress.extension.brotli}`;

				await Promise.all([fs.promises.writeFile(filePath, newlyJson), fs.promises.writeFile(brotliFilePath, newlyJsonBrotli)]);
				createdFilesPath.push(filePath);
				createdFilesPath.push(brotliFilePath);
			}),
		);

		return {
			createdFilesPath: createdFilesPath,
		};
	}
}
