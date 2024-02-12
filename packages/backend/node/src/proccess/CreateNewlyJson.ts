import fs from 'node:fs';
import BlogCreateNewlyJsonDao from '../dao/BlogCreateNewlyJsonDao.js';
import MarkdownTitle from '../markdown/Title.js';
import Compress from '../util/Compress.js';
import type { JSON as Configure } from '../../../configure/type/newly-json.js';

/**
 * 新着 JSON ファイル生成
 */
export default class CreateNewlyJson {
	#config: Configure;

	constructor() {
		this.#config = JSON.parse(fs.readFileSync('configure/newly-json.json', 'utf8'));
	}

	/**
	 * @param configCommon 共通設定ファイル
	 * @param configCommon.dbFilePath DB ファイルパス
	 * @param configCommon.root ルートディレクトリ
	 *
	 * @returns ファイル生成が成功したかどうか
	 */
	async execute(configCommon: { dbFilePath: string; root: string }): Promise<{
		created: string[];
	}> {
		const dao = new BlogCreateNewlyJsonDao(configCommon.dbFilePath);

		const datasCatgroup = new Map<string, BlogView.NewlyEntry[]>();

		datasCatgroup.set('', await dao.getEntriesNewly(this.#config.max));

		await Promise.all(
			(await dao.getCategoryGroupMasterFileName()).map(async (fileName) => {
				datasCatgroup.set(fileName, await dao.getEntriesNewly(this.#config.max, fileName));
			}),
		);

		const created: string[] = [];

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
				const filePath = `${configCommon.root}/${this.#config.directory}/${fileName}.${this.#config.extension}`;
				const brotliFilePath = `${filePath}.br`;

				await Promise.all([fs.promises.writeFile(filePath, newlyJson), fs.promises.writeFile(brotliFilePath, newlyJsonBrotli)]);
				created.push(filePath);
				created.push(brotliFilePath);
			}),
		);

		return {
			created: created,
		};
	}
}
